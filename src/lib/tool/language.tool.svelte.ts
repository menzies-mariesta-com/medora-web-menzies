import { LanguageEnum } from "$lib/model/enum/language.enum";
import { setLocale, getLocale } from "$lib/paraglide/runtime";

export class LanguageTool {
    getLanguage(): LanguageEnum {
        if (!getLocale()) {
            this.setDefaultLanguage();
        }
        return getLocale() as LanguageEnum;
    }

    setDefaultLanguage() {
        this.changeLanguage(LanguageEnum.ENGLISH);
    }

    changeLanguage(language: LanguageEnum) {
        setLocale(language);
    }
}