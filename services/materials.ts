import { supabase } from "./supabase";

export async function uploadMaterial(
  uri: string,
  fileName: string,
  browserFile?: Blob
) {
  // 1. Confirma o usuário autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "Usuário não está autenticado."
    );
  }

  // 2. Lê o PDF selecionado
  let fileBody: Blob | ArrayBuffer;
  if (browserFile) {
    fileBody = browserFile;
  } else {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("Não foi possível ler o PDF selecionado.");
    }
    fileBody = await response.arrayBuffer();
  }

  if (
    (fileBody instanceof Blob && fileBody.size === 0) ||
    (fileBody instanceof ArrayBuffer && fileBody.byteLength === 0)
  ) {
    throw new Error(
      "O PDF selecionado está vazio ou não pôde ser lido."
    );
  }

  const safeFileName = fileName
    .replace(/[\\/]/g, "-")
    .trim();

  if (!safeFileName) {
    throw new Error(
      "Nome do arquivo inválido."
    );
  }

  const filePath =
    `${user.id}/${Date.now()}-${safeFileName}`;

  // 3. Envia o PDF ao Storage
  const { error: uploadError } =
    await supabase.storage
      .from("study-materials")
      .upload(
        filePath,
        fileBody,
        {
          contentType:
            "application/pdf",
          upsert: false,
        }
      );

  if (uploadError) {
    throw new Error(
      `Não foi possível enviar o PDF: ${uploadError.message}`
    );
  }

  /*
    Se o servidor recusar o cadastro
    ou ocorrer outra falha, removemos
    o PDF recém-enviado do Storage.
  */
  const removerPdfEnviado =
    async () => {
      try {
        const {
          error: cleanupError,
        } =
          await supabase.storage
            .from("study-materials")
            .remove([filePath]);

        if (cleanupError) {
          console.log(
            "ERRO AO REMOVER PDF APÓS FALHA:",
            cleanupError
          );
        }
      } catch (cleanupError) {
        console.log(
          "ERRO INESPERADO NA LIMPEZA DO PDF:",
          cleanupError
        );
      }
    };

  // 4. O servidor verifica o plano
  // e cria o registro em materials.
  const {
    data,
    error,
  } =
    await supabase.functions.invoke(
      "create-material",
      {
        body: {
          title: fileName,
          filePath,
        },
      }
    );

  if (error) {
    console.log(
      "ERRO CREATE-MATERIAL:",
      error
    );

    let mensagem =
      error.message ||
      "Não foi possível registrar a apostila.";

    try {
      const contexto: any =
        (error as any).context;

      if (contexto) {
        const resposta =
          contexto.clone
            ? contexto.clone()
            : contexto;

        const json =
          await resposta.json();

        mensagem =
          json?.error ||
          json?.message ||
          mensagem;
      }
    } catch {
      // Mantém a mensagem original.
    }

    await removerPdfEnviado();

    throw new Error(mensagem);
  }

  if (
    data?.ok !== true ||
    !data?.material
  ) {
    await removerPdfEnviado();

    throw new Error(
      data?.error ||
      "Não foi possível registrar a apostila."
    );
  }

  // O cadastro só está completo quando o processamento também foi iniciado.
  // Se a IA falhar, preservamos o material enviado para que a falha fique visível
  // na biblioteca e não apagamos o arquivo nem o registro recém-criado.
  const {
    data: processingData,
    error: processingError,
  } = await supabase.functions.invoke("process-material", {
    body: { materialId: data.material.id },
  });

  if (processingError || processingData?.ok !== true) {
    let message = processingError?.message || processingData?.error;
    try {
      const context: any = (processingError as any)?.context;
      if (context) {
        const response = context.clone ? context.clone() : context;
        const json = await response.json();
        message = json?.error || json?.message || message;
      }
    } catch {
      // Keep the function's original error message.
    }

    return {
      material: data.material,
      processingError:
        message ||
        "O PDF foi salvo, mas o processamento não foi concluído.",
    };
  }

  return {
    material: {
      ...data.material,
      status: processingData.status || "ready",
    },
    processingError: null,
  };
}
