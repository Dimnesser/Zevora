import { CloudOff } from "lucide-react";

/**
 * Only rendered by the static build published to GitHub Pages.
 *
 * The interface is the real one, but there is no server behind it: the
 * draw runs in the visitor's own browser and the account lives in local
 * storage. That difference is the whole point of the product — a case
 * site whose odds you cannot verify is a case site you should not trust —
 * so it is stated at the top of every page rather than buried in a
 * footnote.
 */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_ZEVORA_STATIC !== "1") return null;

  return (
    <div className="relative z-[70] border-b border-gold-400/20 bg-gold-400/[0.07]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-2.5 px-4 py-2 sm:px-6">
        <CloudOff size={13} className="shrink-0 text-gold-300" />
        <p className="text-[11.5px] leading-snug text-gold-200/90">
          <b className="font-semibold">Витрина без сервера.</b>{" "}
          <span className="text-gold-200/70">
            Розыгрыш считается в браузере, аккаунт хранится только здесь.
            {/* The full explanation would eat five lines of a phone's first
                screen, so the phone gets the part that changes behaviour. */}
            <span className="hidden sm:inline">
              {" "}
              В рабочей версии всё это на сервере, и билет розыгрыша можно
              перепроверить.
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}
