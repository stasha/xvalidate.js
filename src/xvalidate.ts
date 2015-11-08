/// <reference path="typings/validatejs/validatejs.d.ts" />

/**
 * @preserve
 * https://github.com/stasha/xvalidate.js
 * xvalidate.js is just "extension" to 
 * validate.js (2.0.0) (https://github.com/rickharrison/validate.js) library.
 * 
 * It enables:
 * 
 * - defining inline rules directly on html element using standard HTML attributes,
 *   using data-{rule-name} attributes or just {rule-name} attributes.
 * - validation while typing
 * - postponing typing validation till the first submit
 * - validation throttling while typing
 * - displaying messages below input, above input or in other specified custom element.
 * - specifying custom HTML messages and message template
 * - enabling/disabling validation
 *	
 *	
 * Copyright (c) 2015 Stanislav Zorjan, http://www.stasha.info
 * xvalidatejs is open sourced under the MIT license.
 */

/**
 * Validation rules available in validatejs library.
 */
module xvalidatejs {
	enum Rules {
		required,
		matches,
		default,
		valid_email,
		valid_emails,
		min_length,
		max_length,
		exact_length,
		greater_than,
		less_than,
		alpha,
		alpha_numeric,
		alpha_dash,
		numeric,
		integer,
		decimal,
		is_natural,
		is_natural_no_zero,
		valid_ip,
		valid_base64,
		valid_credit_card,
		is_file_type,
		valid_url,
		greater_than_date,
		less_than_date,
		greater_than_or_equal_date,
		less_than_or_equal_date,
	}
	
	

	/**
	 * Attributes used in requirejs fields object.
	 */
	enum Attr {
		name,
		display,
		rules
	}
	
	

	/**
	 * Mapping html rules with same name to diferent validatejs rules based on
	 * input type attribute. 
	 */
	var ruleMap: any = {
		date: {
			min: Rules.greater_than_date,
			max: Rules.less_than_date
		},
		number: {
			min: Rules.greater_than,
			max: Rules.less_than
		},
		default: {
			min: Rules.min_length,
			max: Rules.max_length
		}
	}
	

	/**
	 * Configuration class for configuring xvalidate.
	 */
	export class Configuration {
		
		/**
		 * Class attached to form or input fields when validation failes.
		 */
		public errorClass: string = "error";
		
		/**
		 * BELOW_INPUT | ABOVE_INPUT | [custom css selector where to put messages]
		 * Default: BELOW_INPUT
		 */
		//		public displayMessagePlacement: string = "div.validation-messages";
		public displayMessagePlacement: string = "BELOW_INPUT";
		
		/**
		 * HTML template for holding messages.
		 * When changing template, 'validation-messages' class should be present.
		 */
		public messagesTemplate: string = '<ul class="validation-messages"></ul>';
		
		/**
		 * HTML template for single message.
		 */
		public messageTemplate: string = '<li><label for="${id}">${message}</label></li>';
		
		/**
		 * By default elements are set to trigger validation every time keyup event ocures.
		 * By setting this property to true, keyup event will trigger validation only when
		 * first form submit failes.
		 */
		public postponeKeyUpValidationTillTheFirstSubmit: boolean = true;
		
		/**
		 * Debounce validation interval used when typing.
		 */
		public debounceKeyUpValidationInterval: number = 200;
		
		/**
		 * By default only first validation message is dysplayed.
		 * For example if input has 'required' and min='10' constraints.
		 * If input is left empty only the messages for required be displayied.
		 * By setting this property to true, all messages for failed validation constraint
		 * will be displayed.
		 */
		public displayAllMessages: boolean = false;
	}


	/**
	 * Validator class. 
	 * @example: 
	 *	var validator = new xvalidate.Validator(document.forms[0], [
				{name: "firstName2", rules: 'required'}
			], function(errors, e){
				console.log(errors);
			}
		);
	 */
	export class Validator {

		private form: HTMLFormElement;
		private fields: Object[];
		private inlineFields: Object[];
		private mergedFields: Object[];
		private callback: (errors: Object[], event: Event) => void;
		private validationCallback: (errors: Object[], event: Event) => void;

		private bindValidationFunction: any;
		private bindDebouncedValidationFunction: any;

		private _formValidator: validatejs.FormValidator;
		private _configuration: Configuration = new Configuration();
		private _validateOnKeyUp: boolean;
		private _disabled: boolean = true;
		private _debounceTimeout: number;

		/**
		 * 
		 */
		constructor(form: HTMLFormElement, fields?: Object[], callback?: (errors: Object[], event: Event) => void) {
			this.form = form;
			this.fields = fields;
			this.callback = callback;
			this.bindValidationFunction = this.validate.bind(this);
			this.bindDebouncedValidationFunction = this.debounceValidateOnKeyUp.bind(this);
			this.createValidator();
			if (!this.configuration.postponeKeyUpValidationTillTheFirstSubmit) {
				this.validateOnKeyUp = true;
			}
		}

		/**
		 * 
		 */
		public destroy() {
			delete this.fields;
			delete this.mergedFields;
			delete this.inlineFields;
			delete this.callback;
			delete this.formValidator;
			this.validateOnKeyUp = false;
		}
		
		/**
		 * 
		 */
		private createValidator() {
			if (this._formValidator != null) {
				return;
			}

			var self = this;
			if (this.form.attributes.getNamedItem("novalidate")) {
				return;
			}


			if (!this.mergedFields || (this.mergedFields && !this.mergedFields.length)) {

				this.process();

				this.validationCallback = this.validationCallback || function(errors, event) {

					if (typeof this.callback === 'function') {
						this.callback(errors, event);
					}

					if (event && event.defaultPrevented) {
						return;
					}

					this.clearValidations();

					if (errors.length > 0) {
						this.form.classList.add(this.configuration.errorClass);

						if (this.configuration.postponeKeyUpValidationTillTheFirstSubmit && (event && event.type === 'submit')) {
							this.validateOnKeyUp = true;
						}

						this.displayMessages(errors);

					} else if (errors.length === 0) {
						this.form.classList.remove(this.configuration.errorClass);
					}
				}


				this._formValidator = new FormValidator(this.form, this.mergedFields, this.validationCallback.bind(self));
			}
		}

		/**
		 * 
		 */
		private displayMessages(errors: any[]): void {

			var allMsgString = "";

			for (var i = 0; i < errors.length; ++i) {
				var error = (errors[i] as any);
				var element: HTMLElement = error.element as HTMLElement;
				var messages = error.messages;

				element.classList.add(this.configuration.errorClass);

				var msgString = "";
				var count = this.configuration.displayAllMessages ? messages.length : 1;
				for (var n = 0; n < count; ++n) {
					msgString += this.configuration.messageTemplate.replace("${id}", element.id).replace("${message}", messages[n]);
					allMsgString += msgString;
				}


				if (this.configuration.displayMessagePlacement === 'ABOVE_INPUT') {
					element.parentNode.insertBefore(this.createMessageList(msgString), element.previousSibling);
				} else if (this.configuration.displayMessagePlacement === 'BELOW_INPUT') {
					element.parentNode.insertBefore(this.createMessageList(msgString), element.nextSibling);
				}
			}

			if (this.configuration.displayMessagePlacement !== 'ABOVE_INPUT' && this.configuration.displayMessagePlacement !== 'BELOW_INPUT') {
				var msgHolder: HTMLElement = document.querySelector(this.configuration.displayMessagePlacement) as HTMLElement;
				if (msgHolder == null) {
					console.warn('there is no element with selector ' + this.configuration.displayMessagePlacement);
				} else {
					msgHolder.appendChild(this.createMessageList(allMsgString));
				}
			}
		}

		private createMessageList(msgString: string) {
			var list: HTMLElement = document.createElement("div");
			list.innerHTML = this.configuration.messagesTemplate;
			list = list.children[0] as any;
			list.innerHTML = msgString;
			return list;
		}


		public set configuration(configuration: Configuration) {
			this._configuration = configuration;
		}

		public get configuration(): Configuration {
			return this._configuration;
		}

		public set validateOnKeyUp(value: boolean) {
			if (this._validateOnKeyUp === value) {
				return;
			}

			this.form[value ? 'addEventListener' : 'removeEventListener']('keyup', this.bindDebouncedValidationFunction, true);
		}

		private debounceValidateOnKeyUp() {
			clearInterval(this._debounceTimeout);
			this._debounceTimeout = setTimeout(() => {
				this.bindValidationFunction();
			}, this.configuration.debounceKeyUpValidationInterval);
		}


		public get validateOnKeyUp() {
			return this._validateOnKeyUp;
		}

		public set disabled(value: boolean) {
			if (value === this._disabled) {
				return;
			}
			this._disabled = value;
			if (this._disabled) {
				this.formValidator.fields = [];
			} else {
				this.formValidator.fields = this.mergedFields;
			}
		}

		public get disabled(): boolean {
			return this._disabled;
		}


		public validate(): void {
			if (this.form.attributes.getNamedItem("novalidate")) {
				return;
			}
			//this.clearValidations();
			this._formValidator._validateForm(null);
		}


		private clearValidations() {
			var messageContainers = document.querySelectorAll(this.configuration.displayMessagePlacement);
			var inputs = this.form.querySelectorAll('.' + this.configuration.errorClass);
			var errorLists = this.form.querySelectorAll('.validation-messages');


			for (var i = 0; i < messageContainers.length; ++i) {
				(messageContainers[i] as HTMLElement).innerHTML = '';
			}

			for (var i = 0; i < inputs.length; ++i) {
				var input: HTMLElement = inputs[i] as HTMLElement;
				input.classList.remove(this.configuration.errorClass);
			}

			for (var i = 0; i < errorLists.length; ++i) {
				errorLists[i].parentElement.removeChild(errorLists[i]);
			}
		}

		public get formValidator(): validatejs.FormValidator {
			return this._formValidator;
		}

		/**
		 * 
		 */
		public process(): Object {
			this.inlineFields = [];

			if (this.form == null) {
				throw "You can't process \"null\" form.";
			}

			for (var i = 0; i < this.form.length; ++i) {
				var elObj = this.processElement(this.form[i]);
				if (elObj) {
					this.inlineFields.push(elObj);
				}
			}

			this.mergedFields = this.mergeFields(this.inlineFields, this.fields);
			
			//console.log(this.mergedFields);
			
			return this.mergedFields;
		}
		
		

		/**
		 * 
		 */
		private processElement(element: HTMLInputElement): Object {
			if (!element.name || element.type === "hidden") {
				return
			}
			if (element.id == "") {
				console.warn('Error messages for the input fields without ID attribute will be grouped under single object. To avoid this behavior, assign unique ID to input element.')
			}

			var obj: any = { name: element.name };

			for (var a = 0; a < element.attributes.length; ++a) {
				this.processAttribute(element.type, element.attributes[a], obj);
			}

			if (obj.rules.trim() === "") {
				return null;
			}

			obj.rules = obj.rules.replace("|", "");

			return obj;
		}
		
		

		/**
		 * 
		 */
		private processAttribute(elType: string, attr: any, objToFill: any): Object {
			var attrName = this.processAttributeName(elType, attr.name);


			objToFill.rules = objToFill.rules || "";

			for (var i in Attr) {
				if (this.compare(attrName, i)) {
					if (attrName === "rules") {
						objToFill.rules = (attr.value === "" ? '' : attr.value);
					} else {
						objToFill[i] = attr.value;
					}
				};
			}
			for (var i in Rules) {
				if (this.compare(attrName, i)) {
					objToFill.rules += '|' + (attrName + (attr.value === "" ? '' : '[' + attr.value + ']'));
				};
			}

			return objToFill;
		}
		
		

		/**
		 * 
		 */
		private processAttributeName(elType: string, attr: string): string {
			attr = attr.replace("data-", "");

			var rm = ruleMap[elType] || ruleMap["default"];
			attr = Rules[rm[attr]] || attr;

			return attr.toLowerCase();
		}
		
		

		/**
		 * 
		 */
		private compare(attr: string, rule: any): boolean {
			attr = this.convertSnakeCase(attr);
			var ruleName = this.convertSnakeCase(rule);
			
			//console.log(attr, ruleName);

			if (ruleName === attr) {
				return true;
			}

			return false;
		}
		
		

		/**
		 * 
		 */
		private convertSnakeCase(str: string): string {
			return str.replace(/_/g, '-');
		}

		private mergeFields(inlineFields: any[], fields: any[]): any {
			var merged: any[] = inlineFields;
			FIELD_MERGE:
			for (var i = 0; i < fields.length; ++i) {
				var field = fields[i];
				for (var n = 0; n < inlineFields.length; ++n) {
					if (field.name === inlineFields[n].name) {
						continue FIELD_MERGE;
					}
				}
				merged.push(field);
			}

			return merged;
		}

	}

}
	