// Type definitions for validate.js 2.0.0

declare module validatejs {

    interface FormValidator {
        new (formNameOrNode: any, fields: any[], callback: (err: string[], e: Event) => void): FormValidator;

        setMessage(rule: string, message: string): void;
        registerCallback(rule: string, callback: (err: string[], e: Event) => boolean): void;
        registerConditional(name: string, callback: (field: any) => void): void;
        
        /**
         * Runs the validation.
         */
        _validateForm(e:Event):void;
		
		fields:any[];
    }
    
}


declare var FormValidator: validatejs.FormValidator;

