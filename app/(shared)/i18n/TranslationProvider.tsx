"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { en, ko, type TranslationKey } from "./translations";

type Params = Record<string, string | number>;
type TFunction = (key: TranslationKey, params?: Params) => string;

const TranslationContext = createContext<TFunction>((key) => key);

function interpolate(str: string, params?: Params): string {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export function TranslationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [locale, setLocale] = useState<"ko" | "en">("ko");

    useEffect(() => {
        const lang = navigator.language;
        setLocale(lang.startsWith("ko") ? "ko" : "en");
    }, []);

    const t = useCallback(
        (key: TranslationKey, params?: Params) => {
            const dict = locale === "ko" ? ko : en;
            return interpolate(dict[key], params);
        },
        [locale],
    );

    return (
        <TranslationContext.Provider value={t}>
            {children}
        </TranslationContext.Provider>
    );
}

export function useTranslation() {
    return useContext(TranslationContext);
}
