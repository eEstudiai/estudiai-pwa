import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { voltar } from "../services/navegacao";

import { router } from "expo-router";

export default function PoliticaPrivacidade() {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => voltar("/configuracoes")}
        >
          <Text style={styles.backText}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Política de Privacidade
        </Text>

        <Text style={styles.subtitle}>
          EstudaIA
        </Text>

        <Text style={styles.updated}>
          Última atualização: 16 de setembro de 2026
        </Text>

        <Text style={styles.intro}>
          Esta Política de Privacidade descreve como o
          EstudaIA coleta, utiliza, armazena, processa,
          compartilha e protege dados relacionados aos
          usuários do aplicativo.
        </Text>

        <Text style={styles.paragraph}>
          Ao utilizar o EstudaIA, o usuário poderá
          fornecer informações necessárias para criação
          da conta e utilizar recursos que envolvem o
          envio de materiais de estudo, imagens de
          questões e outros conteúdos destinados às
          funcionalidades educacionais do aplicativo.
        </Text>

        <Section title="1. Sobre o EstudaIA">
          <Paragraph>
            O EstudaIA é um aplicativo educacional que
            permite ao usuário enviar seus próprios
            materiais de estudo e utilizar recursos
            apoiados por inteligência artificial para
            estudar esses conteúdos.
          </Paragraph>

          <Paragraph>
            Entre as funcionalidades estão análise e
            resolução de questões, geração de resumos,
            simulados, mapas mentais e outros recursos
            de apoio ao estudo.
          </Paragraph>

          <Paragraph>
            Para questões relacionadas à privacidade e
            proteção de dados, o contato oficial é:
          </Paragraph>

          <Text style={styles.contact}>
            estudiai.app@gmail.com
          </Text>
        </Section>

        <Section title="2. Dados que podem ser tratados">
          <Paragraph>
            Dependendo das funcionalidades utilizadas,
            o EstudaIA poderá tratar os seguintes dados:
          </Paragraph>

          <Bullet>
            endereço de e-mail e informações necessárias
            à autenticação da conta;
          </Bullet>

          <Bullet>
            identificadores técnicos vinculados à conta;
          </Bullet>

          <Bullet>
            apostilas, documentos PDF e outros materiais
            enviados pelo usuário;
          </Bullet>

          <Bullet>
            imagens ou fotografias de questões;
          </Bullet>

          <Bullet>
            texto extraído ou transcrito das questões;
          </Bullet>

          <Bullet>
            perguntas e conteúdos enviados pelo usuário;
          </Bullet>

          <Bullet>
            respostas, explicações e resultados
            produzidos pelo sistema;
          </Bullet>

          <Bullet>
            resumos gerados a partir dos materiais;
          </Bullet>

          <Bullet>
            simulados, questões, alternativas, respostas
            e explicações;
          </Bullet>

          <Bullet>
            mapas mentais gerados a partir dos materiais;
          </Bullet>

          <Bullet>
            informações técnicas necessárias ao
            funcionamento, segurança, diagnóstico e
            prevenção de falhas do serviço.
          </Bullet>

          <Paragraph>
            O EstudaIA procura tratar somente os dados
            necessários para fornecer suas
            funcionalidades.
          </Paragraph>
        </Section>

        <Section title="3. Finalidades do tratamento">
          <Paragraph>
            Os dados podem ser utilizados para permitir
            a criação e autenticação da conta; armazenar
            e organizar os materiais do usuário;
            processar apostilas; analisar questões;
            gerar respostas e explicações; criar
            resumos, simulados e mapas mentais; manter
            histórico e resultados associados à conta;
            evitar processamento repetido
            desnecessário; manter a segurança e
            estabilidade do serviço; diagnosticar
            erros; e atender solicitações relacionadas
            à conta e à privacidade.
          </Paragraph>

          <Paragraph>
            Os dados não serão utilizados para
            finalidades incompatíveis com aquelas
            relacionadas à prestação e manutenção do
            EstudaIA sem fundamento apropriado e a
            transparência necessária ao usuário.
          </Paragraph>
        </Section>

        <Section title="4. Materiais enviados pelo usuário">
          <Paragraph>
            Quando o usuário envia uma apostila ao
            EstudaIA, o arquivo pode ser armazenado na
            infraestrutura utilizada pelo aplicativo e,
            quando necessário para disponibilizar
            recursos de inteligência artificial,
            enviado para processamento e indexação por
            serviços da OpenAI.
          </Paragraph>

          <Paragraph>
            Essa indexação permite que funcionalidades
            do EstudaIA pesquisem informações existentes
            no material enviado pelo próprio usuário.
          </Paragraph>

          <Paragraph>
            Os materiais permanecem associados à conta
            correspondente no sistema do EstudaIA.
          </Paragraph>

          <Paragraph>
            O usuário é responsável por possuir
            autorização ou fundamento legítimo para
            enviar e utilizar os documentos e demais
            conteúdos submetidos ao aplicativo.
          </Paragraph>
        </Section>

        <Section title="5. Fotografias e resolução de questões">
          <Paragraph>
            Quando uma fotografia de uma questão é
            enviada ao EstudaIA, a imagem pode ser
            armazenada na infraestrutura utilizada pelo
            aplicativo e enviada à OpenAI para
            processamento.
          </Paragraph>

          <Paragraph>
            Esse processamento pode envolver a
            interpretação ou transcrição do conteúdo da
            imagem e a utilização do texto resultante
            para gerar uma resposta.
          </Paragraph>

          <Paragraph>
            Quando necessário, o EstudaIA também poderá
            consultar os materiais de estudo previamente
            enviados pelo usuário para fundamentar a
            resposta.
          </Paragraph>

          <Paragraph>
            As questões, respostas e determinadas
            informações relacionadas poderão ser
            armazenadas para disponibilização do
            histórico e funcionamento das demais
            funcionalidades do aplicativo.
          </Paragraph>
        </Section>

        <Section title="6. Recursos de inteligência artificial">
          <Paragraph>
            O EstudaIA utiliza serviços de inteligência
            artificial para determinadas
            funcionalidades.
          </Paragraph>

          <Paragraph>
            Dependendo do recurso utilizado, informações
            necessárias à execução da solicitação
            poderão ser processadas por sistemas da
            OpenAI.
          </Paragraph>

          <Paragraph>
            Isso pode incluir materiais enviados pelo
            usuário, conteúdo recuperado desses
            materiais, imagens de questões, transcrições,
            perguntas e conteúdos necessários à geração
            de respostas, resumos, simulados e mapas
            mentais.
          </Paragraph>

          <Paragraph>
            Os resultados gerados por inteligência
            artificial podem conter erros ou
            imprecisões. O EstudaIA deve ser utilizado
            como ferramenta de apoio aos estudos, e o
            usuário deve verificar informações
            importantes quando necessário.
          </Paragraph>
        </Section>

        <Section title="7. Prestadores de serviços">
          <Paragraph>
            Para operar o aplicativo, o EstudaIA utiliza
            serviços tecnológicos de terceiros.
          </Paragraph>

          <Text style={styles.provider}>
            Supabase
          </Text>

          <Paragraph>
            Utilizado para funções como autenticação,
            banco de dados, armazenamento de arquivos e
            execução de serviços de backend.
          </Paragraph>

          <Text style={styles.provider}>
            OpenAI
          </Text>

          <Paragraph>
            Utilizada para funcionalidades de
            inteligência artificial, incluindo
            processamento de conteúdo, interpretação de
            questões e pesquisa em materiais
            disponibilizados para essas funcionalidades.
          </Paragraph>

          <Paragraph>
            O compartilhamento com esses prestadores
            ocorre conforme necessário para execução das
            funcionalidades correspondentes e está
            sujeito também às práticas de privacidade e
            segurança desses fornecedores.
          </Paragraph>
        </Section>

        <Section title="8. Transferência internacional de dados">
          <Paragraph>
            Alguns fornecedores tecnológicos utilizados
            pelo EstudaIA podem operar infraestrutura
            localizada fora do Brasil ou realizar
            processamento internacional.
          </Paragraph>

          <Paragraph>
            Consequentemente, determinados dados poderão
            ser objeto de tratamento ou transferência
            internacional quando necessário para
            prestação desses serviços.
          </Paragraph>

          <Paragraph>
            O EstudaIA buscará realizar essas operações
            observando a legislação aplicável,
            incluindo a Lei Geral de Proteção de Dados
            Pessoais — LGPD e as regras aplicáveis às
            transferências internacionais de dados.
          </Paragraph>
        </Section>

        <Section title="9. Armazenamento e segurança">
          <Paragraph>
            O EstudaIA utiliza medidas técnicas e
            administrativas destinadas a proteger os
            dados contra acessos não autorizados e
            situações acidentais ou ilícitas de
            destruição, perda, alteração ou divulgação.
          </Paragraph>

          <Paragraph>
            Entretanto, nenhum sistema conectado à
            internet pode garantir segurança absoluta.
          </Paragraph>

          <Paragraph>
            O acesso às informações vinculadas à conta
            é estruturado para que os dados de cada
            usuário sejam associados à respectiva conta
            e às autorizações aplicáveis.
          </Paragraph>
        </Section>

        <Section title="10. Retenção">
          <Paragraph>
            Os dados poderão permanecer armazenados
            enquanto forem necessários para fornecer as
            funcionalidades do EstudaIA, manter a conta
            e atender às finalidades descritas nesta
            Política.
          </Paragraph>

          <Paragraph>
            Determinadas informações também poderão ser
            mantidas quando necessário para cumprimento
            de obrigações legais, exercício regular de
            direitos, segurança, prevenção de fraude ou
            outras hipóteses permitidas pela legislação.
          </Paragraph>

          <Paragraph>
            Os períodos de armazenamento também podem
            depender dos serviços de infraestrutura
            utilizados para executar determinadas
            funcionalidades.
          </Paragraph>
        </Section>

        <Section title="11. Exclusão da conta">
          <Paragraph>
            O usuário pode solicitar a exclusão da
            própria conta diretamente pelo EstudaIA.
          </Paragraph>

          <Paragraph>
            A exclusão da conta inicia o processo de
            remoção dos dados associados à conta nos
            sistemas utilizados pelo EstudaIA,
            observadas eventuais hipóteses em que a
            conservação seja necessária ou permitida
            por lei.
          </Paragraph>

          <Paragraph>
            Quando aplicável, também são realizadas
            operações destinadas à exclusão de arquivos
            e recursos associados mantidos nos serviços
            tecnológicos utilizados pelo aplicativo.
          </Paragraph>

          <Paragraph>
            Também poderá ser disponibilizado um meio
            pela web para solicitação de exclusão da
            conta e dos dados associados, conforme os
            requisitos das plataformas de distribuição
            do aplicativo.
          </Paragraph>
        </Section>

        <Section title="12. Direitos do titular">
          <Paragraph>
            Nos termos da Lei Geral de Proteção de Dados
            Pessoais — LGPD e conforme aplicável ao caso
            concreto, o usuário poderá exercer direitos
            relacionados aos seus dados pessoais.
          </Paragraph>

          <Paragraph>
            Esses direitos podem incluir confirmação da
            existência de tratamento, acesso aos dados,
            correção de informações incompletas,
            inexatas ou desatualizadas, anonimização,
            bloqueio ou eliminação nas hipóteses legais,
            informações sobre compartilhamento,
            portabilidade conforme regulamentação
            aplicável e eliminação de dados tratados com
            consentimento quando cabível.
          </Paragraph>

          <Paragraph>
            O usuário também poderá exercer outros
            direitos previstos na legislação brasileira
            e apresentar petição à Autoridade Nacional
            de Proteção de Dados — ANPD, quando
            aplicável.
          </Paragraph>

          <Paragraph>
            Solicitações relacionadas à privacidade
            poderão ser encaminhadas para:
          </Paragraph>

          <Text style={styles.contact}>
            estudiai.app@gmail.com
          </Text>
        </Section>

        <Section title="13. Crianças e adolescentes">
          <Paragraph>
            O EstudaIA é destinado a usuários com 18
            anos ou mais e não é direcionado a crianças
            ou adolescentes menores de 18 anos.
          </Paragraph>

          <Paragraph>
            O EstudaIA não busca coletar
            intencionalmente dados pessoais de menores
            de 18 anos. Caso seja identificado que dados
            de uma pessoa menor de 18 anos foram
            fornecidos em desacordo com esta condição,
            poderão ser adotadas medidas para sua
            exclusão, conforme aplicável.
          </Paragraph>

          <Paragraph>
            Pais, responsáveis ou titulares que tenham
            conhecimento de situação dessa natureza
            poderão entrar em contato pelo e-mail
            estudiai.app@gmail.com.
          </Paragraph>
        </Section>

        <Section title="14. Alterações desta Política">
          <Paragraph>
            Esta Política poderá ser atualizada para
            refletir alterações nas funcionalidades do
            EstudaIA, nos serviços tecnológicos
            utilizados, nas práticas de tratamento de
            dados ou na legislação aplicável.
          </Paragraph>

          <Paragraph>
            Quando houver alterações relevantes, a
            versão atualizada será disponibilizada por
            meio apropriado e a data de atualização será
            modificada.
          </Paragraph>
        </Section>

        <Section title="15. Contato">
          <Paragraph>
            Dúvidas, solicitações ou questões
            relacionadas a esta Política de Privacidade
            ou ao tratamento de dados pessoais poderão
            ser encaminhadas para:
          </Paragraph>

          <Text style={styles.contact}>
            EstudaIA
          </Text>

          <Text style={styles.contact}>
            estudiai.app@gmail.com
          </Text>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            EstudaIA • Política de Privacidade
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {children}
    </View>
  );
}

function Paragraph({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Text style={styles.paragraph}>
      {children}
    </Text>
  );
}

function Bullet({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>
        •
      </Text>

      <Text style={styles.bulletText}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 50,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 12,
  },

  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B4DBA",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "700",
    color: "#0B4DBA",
  },

  updated: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 13,
    color: "#6B7280",
  },

  intro: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 14,
  },

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: "#4B5563",
    marginBottom: 12,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingRight: 8,
  },

  bullet: {
    width: 20,
    fontSize: 17,
    lineHeight: 23,
    color: "#0B4DBA",
    fontWeight: "800",
  },

  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
    color: "#4B5563",
  },

  provider: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 4,
    marginBottom: 5,
  },

  contact: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
    color: "#0B4DBA",
    marginBottom: 8,
  },

  footer: {
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
  },

  footerText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});