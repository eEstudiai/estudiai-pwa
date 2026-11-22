import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";

import { router } from "expo-router";

export default function TermosDeUso() {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ← Voltar
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Termos de Uso
        </Text>

        <Text style={styles.subtitle}>
          EstudaIA
        </Text>

        <Text style={styles.updated}>
          Última atualização: 16 de setembro de 2026
        </Text>

        <Text style={styles.intro}>
          Estes Termos de Uso estabelecem as condições
          para utilização do aplicativo EstudaIA e de
          suas funcionalidades.
        </Text>

        <Text style={styles.paragraph}>
          Ao criar uma conta e utilizar o EstudaIA, o
          usuário declara estar de acordo com estes
          Termos, observadas as disposições legais
          aplicáveis.
        </Text>

        <Section title="1. Sobre o EstudaIA">
          <Paragraph>
            O EstudaIA é uma ferramenta educacional
            destinada a auxiliar usuários em atividades
            de estudo utilizando seus próprios
            materiais.
          </Paragraph>

          <Paragraph>
            O aplicativo poderá disponibilizar recursos
            como armazenamento e organização de
            apostilas, análise e resolução de questões,
            resumos, simulados, mapas mentais e outras
            ferramentas de apoio à aprendizagem.
          </Paragraph>

          <Paragraph>
            Algumas funcionalidades utilizam sistemas de
            inteligência artificial.
          </Paragraph>
        </Section>

        <Section title="2. Requisitos para utilização">
          <Paragraph>
            O EstudaIA é destinado a pessoas com 18 anos
            ou mais.
          </Paragraph>

          <Paragraph>
            Ao utilizar o aplicativo, o usuário declara
            possuir capacidade para aceitar estes Termos
            e fornecer as informações necessárias à
            criação e manutenção da conta.
          </Paragraph>

          <Paragraph>
            O usuário é responsável pela veracidade das
            informações fornecidas e pela utilização de
            sua conta.
          </Paragraph>
        </Section>

        <Section title="3. Conta do usuário">
          <Paragraph>
            Algumas funcionalidades do EstudaIA exigem a
            criação de uma conta individual.
          </Paragraph>

          <Paragraph>
            O usuário é responsável por manter suas
            credenciais de acesso protegidas e não deve
            compartilhar sua senha com terceiros.
          </Paragraph>

          <Paragraph>
            Caso identifique acesso não autorizado ou
            suspeite que sua conta tenha sido
            comprometida, o usuário deverá adotar as
            medidas disponíveis para proteger sua conta
            e poderá entrar em contato com o EstudaIA.
          </Paragraph>
        </Section>

        <Section title="4. Materiais enviados pelo usuário">
          <Paragraph>
            O EstudaIA permite que o usuário envie
            materiais próprios para utilização nas
            funcionalidades de estudo.
          </Paragraph>

          <Paragraph>
            O usuário permanece responsável pelo
            conteúdo que envia e declara possuir os
            direitos, autorizações ou permissões
            necessários para armazenar, processar e
            utilizar esse conteúdo por meio do
            aplicativo.
          </Paragraph>

          <Paragraph>
            O envio de um material ao EstudaIA não
            transfere ao aplicativo a titularidade
            intelectual do conteúdo pertencente ao
            usuário ou a terceiros.
          </Paragraph>
        </Section>

        <Section title="5. Propriedade intelectual">
          <Paragraph>
            Livros, apostilas, fotografias, documentos e
            outros materiais utilizados no EstudaIA
            podem estar protegidos por direitos autorais
            ou outros direitos de propriedade
            intelectual.
          </Paragraph>

          <Paragraph>
            O usuário não deve utilizar o EstudaIA para
            reproduzir, distribuir ou explorar conteúdo
            protegido de maneira que viole direitos de
            terceiros ou a legislação aplicável.
          </Paragraph>

          <Paragraph>
            Marcas, identidade visual, software,
            interfaces e demais elementos próprios do
            EstudaIA permanecem sujeitos aos respectivos
            direitos aplicáveis.
          </Paragraph>
        </Section>

        <Section title="6. Inteligência artificial">
          <Paragraph>
            Algumas funcionalidades do EstudaIA utilizam
            inteligência artificial para analisar
            materiais, interpretar questões e produzir
            conteúdos destinados ao apoio aos estudos.
          </Paragraph>

          <Paragraph>
            Sistemas de inteligência artificial podem
            produzir respostas incorretas, incompletas,
            imprecisas ou inadequadas ao contexto.
          </Paragraph>

          <Paragraph>
            Por esse motivo, resultados produzidos pelo
            EstudaIA não devem ser considerados
            garantia de correção.
          </Paragraph>

          <Paragraph>
            Informações importantes devem ser
            conferidas pelo usuário com o material
            original ou outras fontes apropriadas antes
            de serem utilizadas em situações relevantes.
          </Paragraph>
        </Section>

        <Section title="7. Finalidade educacional">
          <Paragraph>
            O EstudaIA é uma ferramenta de apoio ao
            estudo e à aprendizagem.
          </Paragraph>

          <Paragraph>
            O aplicativo não garante aprovação em
            provas, concursos, avaliações acadêmicas,
            certificações ou processos seletivos.
          </Paragraph>

          <Paragraph>
            O desempenho do usuário depende de diversos
            fatores que estão fora do controle do
            EstudaIA.
          </Paragraph>
        </Section>

        <Section title="8. Matemática financeira">
          <Paragraph>
            Determinadas questões de matemática
            financeira poderão apresentar cálculos e,
            quando houver suporte no material utilizado,
            sequências destinadas à utilização da
            calculadora HP-12C.
          </Paragraph>

          <Paragraph>
            Esses resultados possuem finalidade
            educacional e devem ser conferidos antes de
            serem utilizados em decisões financeiras ou
            outras situações que possam produzir efeitos
            econômicos.
          </Paragraph>

          <Paragraph>
            O EstudaIA não presta consultoria,
            recomendação ou aconselhamento financeiro.
          </Paragraph>
        </Section>

        <Section title="9. Uso permitido">
          <Paragraph>
            O usuário deverá utilizar o EstudaIA de
            maneira lícita e compatível com sua
            finalidade educacional.
          </Paragraph>

          <Paragraph>
            Não é permitido utilizar o aplicativo para
            tentar acessar dados de outros usuários,
            comprometer a segurança do serviço,
            interferir deliberadamente em seu
            funcionamento ou utilizar as funcionalidades
            para atividades ilícitas.
          </Paragraph>

          <Paragraph>
            Também não é permitido tentar contornar
            mecanismos de autenticação, segurança,
            limites técnicos ou controles implementados
            pelo EstudaIA.
          </Paragraph>
        </Section>

        <Section title="10. Disponibilidade do serviço">
          <Paragraph>
            O EstudaIA poderá passar por manutenção,
            atualizações, correções, alterações técnicas
            ou períodos de indisponibilidade.
          </Paragraph>

          <Paragraph>
            Determinadas funcionalidades também dependem
            de serviços tecnológicos fornecidos por
            terceiros e podem ser afetadas pela
            disponibilidade desses serviços.
          </Paragraph>

          <Paragraph>
            Não é garantido que todas as funcionalidades
            permaneçam disponíveis de forma
            ininterrupta.
          </Paragraph>
        </Section>

        <Section title="11. Alterações das funcionalidades">
          <Paragraph>
            O EstudaIA poderá modificar, aperfeiçoar,
            adicionar ou remover funcionalidades para
            melhorar o serviço, atender requisitos
            técnicos ou legais ou adaptar o aplicativo
            às necessidades de sua operação.
          </Paragraph>

          <Paragraph>
            Alterações relevantes poderão ser
            comunicadas aos usuários por meios
            apropriados.
          </Paragraph>
        </Section>

        <Section title="12. Privacidade e proteção de dados">
          <Paragraph>
            O tratamento de dados pessoais relacionado
            ao uso do EstudaIA é descrito na Política de
            Privacidade do aplicativo.
          </Paragraph>

          <Pressable
            style={styles.privacyButton}
            onPress={() =>
              router.push("/politica-privacidade")
            }
          >
            <Text style={styles.privacyButtonText}>
              Consultar Política de Privacidade
            </Text>

            <Text style={styles.privacyArrow}>
              ›
            </Text>
          </Pressable>
        </Section>

        <Section title="13. Exclusão da conta">
          <Paragraph>
            O usuário poderá solicitar a exclusão da
            própria conta utilizando a funcionalidade
            disponibilizada pelo EstudaIA.
          </Paragraph>

          <Paragraph>
            A exclusão da conta poderá resultar na
            remoção dos materiais, questões, histórico e
            demais informações associadas, observadas as
            hipóteses de conservação permitidas ou
            exigidas pela legislação aplicável.
          </Paragraph>

          <Paragraph>
            Após a exclusão, determinadas informações ou
            funcionalidades poderão não ser
            recuperáveis.
          </Paragraph>
        </Section>

        <Section title="14. Limitação de responsabilidade">
          <Paragraph>
            O EstudaIA busca oferecer ferramentas úteis
            para estudo, mas não garante que conteúdos
            produzidos automaticamente sejam sempre
            completos, corretos ou adequados a uma
            finalidade específica.
          </Paragraph>

          <Paragraph>
            O usuário é responsável por avaliar os
            resultados apresentados antes de utilizá-los
            em decisões ou atividades que possam gerar
            consequências relevantes.
          </Paragraph>

          <Paragraph>
            Nada nestes Termos pretende excluir ou
            limitar responsabilidades que não possam ser
            legalmente excluídas ou limitadas.
          </Paragraph>
        </Section>

        <Section title="15. Suspensão ou encerramento">
          <Paragraph>
            O acesso ao EstudaIA poderá ser limitado,
            suspenso ou encerrado quando necessário para
            proteger a segurança e integridade do
            serviço, cumprir obrigações legais ou
            responder a violações relevantes destes
            Termos.
          </Paragraph>

          <Paragraph>
            Sempre que aplicável, serão consideradas a
            natureza da situação e as exigências da
            legislação pertinente.
          </Paragraph>
        </Section>

        <Section title="16. Alterações destes Termos">
          <Paragraph>
            Estes Termos poderão ser atualizados em
            razão de alterações no EstudaIA, em suas
            funcionalidades, nos serviços utilizados ou
            na legislação aplicável.
          </Paragraph>

          <Paragraph>
            Quando houver alterações relevantes, a
            versão atualizada será disponibilizada por
            meio apropriado e sua data de atualização
            será modificada.
          </Paragraph>
        </Section>

        <Section title="17. Legislação aplicável">
          <Paragraph>
            Estes Termos serão interpretados de acordo
            com a legislação brasileira aplicável,
            respeitados os direitos legalmente
            assegurados aos usuários e consumidores
            quando cabíveis.
          </Paragraph>
        </Section>

        <Section title="18. Contato">
          <Paragraph>
            Dúvidas ou solicitações relacionadas ao
            EstudaIA ou a estes Termos de Uso poderão
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
            EstudaIA • Termos de Uso
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

  privacyButton: {
    marginTop: 5,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8E2F5",
    backgroundColor: "#EEF3FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  privacyButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0B4DBA",
  },

  privacyArrow: {
    marginLeft: 10,
    fontSize: 26,
    color: "#0B4DBA",
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