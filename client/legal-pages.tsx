import React from "react";
import { Button } from "@/components/ui/button";
import { StrategyShellBg } from "../strategy-shell-sidebar";

type TFn = (key: string, fallback?: string) => string;

const articleStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "24px 20px 80px",
  lineHeight: 1.65,
  fontSize: 15,
  color: "var(--text)",
};

const h2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  marginTop: 32,
  marginBottom: 12,
  letterSpacing: "-0.02em",
  color: "var(--text)",
};

const p: React.CSSProperties = { marginBottom: 14, color: "var(--text2)" };

function P({ children }: { children: React.ReactNode }) {
  return <p style={p}>{children}</p>;
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 style={h2}>{children}</h2>;
}

export function LegalDocumentPage({
  kind,
  theme,
  t,
  onHome,
}: {
  kind: "privacy" | "terms";
  theme: string;
  t: TFn;
  onHome: () => void;
}) {
  const dk = theme === "dark" ? "dk" : "lt";
  const title =
    kind === "privacy"
      ? t("legal_privacy_title", "Политика конфиденциальности")
      : t("legal_terms_title", "Условия использования");
  const updated = t("legal_doc_updated", "Последнее обновление: апрель 2026 г.");

  return (
    <div
      className={`sa-strategy-ui sa-legal-page ${dk}`}
      data-theme={theme}
      style={{
        minHeight: "100vh",
        position: "relative",
        fontFamily: "'Inter',system-ui,sans-serif",
        overflowY: "auto",
      }}
    >
      <StrategyShellBg />
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(14px)",
        }}
      >
        <button type="button" className="btn-g" onClick={onHome} style={{ fontSize: 13 }}>
          {t("legal_back_home", "← На главную")}
        </button>
        <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>{title}</span>
      </header>
      <article style={articleStyle}>
        <p style={{ ...p, fontSize: 12, color: "var(--text5)" }}>{updated}</p>
        <P>
          {t(
            "legal_disclaimer",
            "Ниже приведён типовой текст для SaaS-сервиса. Он не заменяет индивидуальную юридическую консультацию; при необходимости согласуйте документ с вашим юристом."
          )}
        </P>

        {kind === "privacy" ? <PrivacyBody t={t} /> : <TermsBody t={t} />}
      </article>
    </div>
  );
}

function PrivacyBody({ t }: { t: TFn }) {
  return (
    <>
      <H>{t("legal_p_s1", "1. Общие положения")}</H>
      <P>
        {t(
          "legal_p_s1_t",
          "Настоящая Политика описывает, как Strategy AI («мы», «Сервис») обрабатывает данные при использовании веб-приложения, API и сопутствующих функций."
        )}
      </P>
      <H>{t("legal_p_s2", "2. Какие данные мы обрабатываем")}</H>
      <P>
        {t(
          "legal_p_s2_t",
          "Учётные данные: адрес электронной почты, имя (если указано), хэш пароля или данные OAuth-провайдера — в объёме, необходимом для аутентификации."
        )}
      </P>
      <P>
        {t(
          "legal_p_s2b",
          "Содержимое работы в продукте: проекты, карты стратегии, узлы, сценарии, комментарии и иные объекты, которые вы создаёте в Сервисе."
        )}
      </P>
      <P>
        {t(
          "legal_p_s2c",
          "Технические данные: журналы запросов, идентификаторы сессии, сведения об устройстве и браузере, IP-адрес — для безопасности, отладки и защиты от злоупотреблений."
        )}
      </P>
      <H>{t("legal_p_s3", "3. Цели обработки")}</H>
      <P>
        {t(
          "legal_p_s3_t",
          "Предоставление функций Сервиса, хранение и синхронизация ваших данных, улучшение качества продукта, поддержка пользователей, соблюдение законодательства и исполнение договора с вами."
        )}
      </P>
      <H>{t("legal_p_s4", "4. Cookies и аналитика")}</H>
      <P>
        {t(
          "legal_p_s4_t",
          "Мы можем использовать файлы cookie и аналогичные технологии для входа в аккаунт, сохранения настроек (тема, язык) и, с вашего согласия, для аналитики трафика (например, Google Analytics, Microsoft Clarity). Вы можете отозвать согласие, очистив cookie и localStorage для нашего домена."
        )}
      </P>
      <H>{t("legal_p_s5", "5. Передача третьим лицам")}</H>
      <P>
        {t(
          "legal_p_s5_t",
          "Данные могут обрабатываться инфраструктурными и облачными провайдерами (хостинг, БД, CDN), платёжными сервисами и инструментами поддержки — только в объёме, необходимом для работы Сервиса, и на основании договоров или стандартных условий обработки данных."
        )}
      </P>
      <H>{t("legal_p_s6", "6. Хранение и безопасность")}</H>
      <P>
        {t(
          "legal_p_s6_t",
          "Мы применяем организационные и технические меры: шифрование при передаче (HTTPS), ограничение доступа, резервное копирование. Срок хранения определяется необходимостью оказания услуг и требованиями закона."
        )}
      </P>
      <H>{t("legal_p_s7", "7. Ваши права")}</H>
      <P>
        {t(
          "legal_p_s7_t",
          "В зависимости от применимого закона вы можете запросить доступ, исправление, удаление данных, ограничение обработки или возражение против неё. Для запросов используйте контакт поддержки, указанный в приложении или на сайте."
        )}
      </P>
    </>
  );
}

function TermsBody({ t }: { t: TFn }) {
  return (
    <>
      <H>{t("legal_t_s1", "1. Принятие условий")}</H>
      <P>
        {t(
          "legal_t_s1_t",
          "Используя Strategy AI, вы подтверждаете, что ознакомились с настоящими Условиями и Политикой конфиденциальности. Если вы не согласны — прекратите использование Сервиса."
        )}
      </P>
      <H>{t("legal_t_s2", "2. Учётная запись")}</H>
      <P>
        {t(
          "legal_t_s2_t",
          "Вы обязуетесь указывать достоверные данные при регистрации и сохранять конфиденциальность учётных данных. Вы несёте ответственность за действия, выполненные под вашей учётной записью."
        )}
      </P>
      <H>{t("legal_t_s3", "3. Лицензия на использование")}</H>
      <P>
        {t(
          "legal_t_s3_t",
          "Мы предоставляем вам ограниченную, неисключительную, отзывную лицензию на доступ к Сервису в соответствии с вашим тарифом. Платформа, её дизайн и код остаются нашей интеллектуальной собственностью."
        )}
      </P>
      <H>{t("legal_t_s4", "4. Контент пользователя")}</H>
      <P>
        {t(
          "legal_t_s4_t",
          "Вы сохраняете права на материалы, которые загружаете и создаёте. Вы предоставляете нам лицензию на хостинг, обработку и отображение этого контента исключительно для работы Сервиса и его улучшения (в обезличенном виде — для аналитики качества)."
        )}
      </P>
      <H>{t("legal_t_s5", "5. Допустимое использование")}</H>
      <P>
        {t(
          "legal_t_s5_t",
          "Запрещено: взламывать или нагружать системы, распространять вредоносный код, нарушать права третьих лиц, использовать Сервис для незаконной деятельности, автоматически скрейпить данные без разрешения."
        )}
      </P>
      <H>{t("legal_t_s6", "6. Тарифы и оплата")}</H>
      <P>
        {t(
          "legal_t_s6_t",
          "Условия оплаты, налоги и возвраты определяются на странице тарифов и при оформлении подписки. Мы можем изменять цены с уведомлением для существующих клиентов в разумный срок."
        )}
      </P>
      <H>{t("legal_t_s7", "7. Ограничение ответственности")}</H>
      <P>
        {t(
          "legal_t_s7_t",
          "Сервис предоставляется «как есть». Мы не гарантируем отсутствие ошибок и не несём ответственности за косвенные убытки, упущенную выгоду или решения, принятые на основе AI-рекомендаций. AI-ответы носят вспомогательный характер."
        )}
      </P>
      <H>{t("legal_t_s8", "8. Изменения и расторжение")}</H>
      <P>
        {t(
          "legal_t_s8_t",
          "Мы можем обновлять Условия; существенные изменения разумно доводим до сведения пользователей. Вы можете прекратить использование в любой момент; мы можем приостановить доступ при нарушении правил."
        )}
      </P>
    </>
  );
}

export function NotFoundPage({
  theme,
  t,
  onHome,
}: {
  theme: string;
  t: TFn;
  onHome: () => void;
}) {
  const dk = theme === "dark" ? "dk" : "lt";
  return (
    <div
      className={`sa-strategy-ui ${dk}`}
      data-theme={theme}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        fontFamily: "'Inter',system-ui,sans-serif",
        background: "var(--bg)",
      }}
    >
      <StrategyShellBg />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }} aria-hidden>
          404
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>
          {t("not_found_title", "Страница не найдена")}
        </h1>
        <p style={{ fontSize: 15, color: "var(--text3)", lineHeight: 1.55, marginBottom: 24 }}>
          {t("not_found_sub", "Такого адреса нет. Вернитесь на главную или откройте приложение.")}
        </p>
        <Button type="button" onClick={onHome}>
          {t("not_found_cta", "На главную")}
        </Button>
      </div>
    </div>
  );
}
