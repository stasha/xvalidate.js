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
 * - displaying message for first failed rule or all failed rules
 * - specifying custom HTML messages and message template
 * - specifying custom error class
 * - enabling/disabling validation
 *
 *
 * Copyright (c) 2015 Stanislav Zorjan, http://www.stasha.info
 * xvalidatejs is open sourced under the MIT license.
 */
/**
 * Validation rules available in validatejs library.
 */
var xvalidatejs;
(function (xvalidatejs) {
    var Rules;
    (function (Rules) {
        Rules[Rules["required"] = 0] = "required";
        Rules[Rules["matches"] = 1] = "matches";
        Rules[Rules["default"] = 2] = "default";
        Rules[Rules["valid_email"] = 3] = "valid_email";
        Rules[Rules["valid_emails"] = 4] = "valid_emails";
        Rules[Rules["min_length"] = 5] = "min_length";
        Rules[Rules["max_length"] = 6] = "max_length";
        Rules[Rules["exact_length"] = 7] = "exact_length";
        Rules[Rules["greater_than"] = 8] = "greater_than";
        Rules[Rules["less_than"] = 9] = "less_than";
        Rules[Rules["alpha"] = 10] = "alpha";
        Rules[Rules["alpha_numeric"] = 11] = "alpha_numeric";
        Rules[Rules["alpha_dash"] = 12] = "alpha_dash";
        Rules[Rules["numeric"] = 13] = "numeric";
        Rules[Rules["integer"] = 14] = "integer";
        Rules[Rules["decimal"] = 15] = "decimal";
        Rules[Rules["is_natural"] = 16] = "is_natural";
        Rules[Rules["is_natural_no_zero"] = 17] = "is_natural_no_zero";
        Rules[Rules["valid_ip"] = 18] = "valid_ip";
        Rules[Rules["valid_base64"] = 19] = "valid_base64";
        Rules[Rules["valid_credit_card"] = 20] = "valid_credit_card";
        Rules[Rules["is_file_type"] = 21] = "is_file_type";
        Rules[Rules["valid_url"] = 22] = "valid_url";
        Rules[Rules["greater_than_date"] = 23] = "greater_than_date";
        Rules[Rules["less_than_date"] = 24] = "less_than_date";
        Rules[Rules["greater_than_or_equal_date"] = 25] = "greater_than_or_equal_date";
        Rules[Rules["less_than_or_equal_date"] = 26] = "less_than_or_equal_date";
    })(Rules || (Rules = {}));
    /**
     * Attributes used in requirejs fields object.
     */
    var Attr;
    (function (Attr) {
        Attr[Attr["name"] = 0] = "name";
        Attr[Attr["display"] = 1] = "display";
        Attr[Attr["rules"] = 2] = "rules";
    })(Attr || (Attr = {}));
    /**
     * Mapping html rules with same name to diferent validatejs rules based on
     * input type attribute.
     */
    var ruleMap = {
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
    };
    /**
     * Configuration class for configuring xvalidate.
     */
    var Configuration = (function () {
        function Configuration() {
            /**
             * Class attached to form or input fields when validation failes.
             */
            this.errorClass = "error";
            /**
             * BELOW_INPUT | ABOVE_INPUT | [custom css selector where to put messages]
             * Default: BELOW_INPUT
             */
            //		public displayMessagePlacement: string = "div.validation-messages";
            this.displayMessagePlacement = "BELOW_INPUT";
            /**
             * HTML template for holding messages.
             * When changing template, 'validation-messages' class should be present.
             */
            this.messagesTemplate = '<ul class="validation-messages"></ul>';
            /**
             * HTML template for single message.
             */
            this.messageTemplate = '<li><label for="${id}">${message}</label></li>';
            /**
             * By default elements are set to trigger validation every time keyup event ocures.
             * By setting this property to true, keyup event will trigger validation only when
             * first form submit failes.
             */
            this.postponeKeyUpValidationTillTheFirstSubmit = true;
            /**
             * Debounce validation interval used when typing.
             */
            this.debounceKeyUpValidationInterval = 200;
            /**
             * By default only first validation message is dysplayed.
             * For example if input has 'required' and min='10' constraints.
             * If input is left empty only the messages for required be displayied.
             * By setting this property to true, all messages for failed validation constraint
             * will be displayed.
             */
            this.displayAllMessages = false;
        }
        return Configuration;
    })();
    xvalidatejs.Configuration = Configuration;
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
    var Validator = (function () {
        /**
         *
         */
        function Validator(form, fields, callback) {
            this._configuration = new Configuration();
            this._disabled = true;
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
        Validator.prototype.destroy = function () {
            delete this.fields;
            delete this.mergedFields;
            delete this.inlineFields;
            delete this.callback;
            delete this.formValidator;
            this.validateOnKeyUp = false;
        };
        /**
         *
         */
        Validator.prototype.createValidator = function () {
            if (this._formValidator != null) {
                return;
            }
            var self = this;
            if (this.form.attributes.getNamedItem("novalidate")) {
                return;
            }
            if (!this.mergedFields || (this.mergedFields && !this.mergedFields.length)) {
                this.process();
                this.validationCallback = this.validationCallback || function (errors, event) {
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
                    }
                    else if (errors.length === 0) {
                        this.form.classList.remove(this.configuration.errorClass);
                    }
                };
                this._formValidator = new FormValidator(this.form, this.mergedFields, this.validationCallback.bind(self));
            }
        };
        /**
         *
         */
        Validator.prototype.displayMessages = function (errors) {
            var allMsgString = "";
            for (var i = 0; i < errors.length; ++i) {
                var error = errors[i];
                var element = error.element;
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
                }
                else if (this.configuration.displayMessagePlacement === 'BELOW_INPUT') {
                    element.parentNode.insertBefore(this.createMessageList(msgString), element.nextSibling);
                }
            }
            if (this.configuration.displayMessagePlacement !== 'ABOVE_INPUT' && this.configuration.displayMessagePlacement !== 'BELOW_INPUT') {
                var msgHolder = document.querySelector(this.configuration.displayMessagePlacement);
                if (msgHolder == null) {
                    console.warn('there is no element with selector ' + this.configuration.displayMessagePlacement);
                }
                else {
                    msgHolder.appendChild(this.createMessageList(allMsgString));
                }
            }
        };
        Validator.prototype.createMessageList = function (msgString) {
            var list = document.createElement("div");
            list.innerHTML = this.configuration.messagesTemplate;
            list = list.children[0];
            list.innerHTML = msgString;
            return list;
        };
        Object.defineProperty(Validator.prototype, "configuration", {
            get: function () {
                return this._configuration;
            },
            set: function (configuration) {
                this._configuration = configuration;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Validator.prototype, "validateOnKeyUp", {
            get: function () {
                return this._validateOnKeyUp;
            },
            set: function (value) {
                if (this._validateOnKeyUp === value) {
                    return;
                }
                this.form[value ? 'addEventListener' : 'removeEventListener']('keyup', this.bindDebouncedValidationFunction, true);
            },
            enumerable: true,
            configurable: true
        });
        Validator.prototype.debounceValidateOnKeyUp = function () {
            var _this = this;
            clearInterval(this._debounceTimeout);
            this._debounceTimeout = setTimeout(function () {
                _this.bindValidationFunction();
            }, this.configuration.debounceKeyUpValidationInterval);
        };
        Object.defineProperty(Validator.prototype, "disabled", {
            get: function () {
                return this._disabled;
            },
            set: function (value) {
                if (value === this._disabled) {
                    return;
                }
                this._disabled = value;
                if (this._disabled) {
                    this.formValidator.fields = [];
                }
                else {
                    this.formValidator.fields = this.mergedFields;
                }
            },
            enumerable: true,
            configurable: true
        });
        Validator.prototype.validate = function () {
            if (this.form.attributes.getNamedItem("novalidate")) {
                return;
            }
            //this.clearValidations();
            this._formValidator._validateForm(null);
        };
        Validator.prototype.clearValidations = function () {
            var messageContainers = document.querySelectorAll(this.configuration.displayMessagePlacement);
            var inputs = this.form.querySelectorAll('.' + this.configuration.errorClass);
            var errorLists = this.form.querySelectorAll('.validation-messages');
            for (var i = 0; i < messageContainers.length; ++i) {
                messageContainers[i].innerHTML = '';
            }
            for (var i = 0; i < inputs.length; ++i) {
                var input = inputs[i];
                input.classList.remove(this.configuration.errorClass);
            }
            for (var i = 0; i < errorLists.length; ++i) {
                errorLists[i].parentElement.removeChild(errorLists[i]);
            }
        };
        Object.defineProperty(Validator.prototype, "formValidator", {
            get: function () {
                return this._formValidator;
            },
            enumerable: true,
            configurable: true
        });
        /**
         *
         */
        Validator.prototype.process = function () {
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
        };
        /**
         *
         */
        Validator.prototype.processElement = function (element) {
            if (!element.name || element.type === "hidden") {
                return;
            }
            if (element.id == "") {
                console.warn('Error messages for the input fields without ID attribute will be grouped under single object. To avoid this behavior, assign unique ID to input element.');
            }
            var obj = { name: element.name };
            for (var a = 0; a < element.attributes.length; ++a) {
                this.processAttribute(element.type, element.attributes[a], obj);
            }
            if (obj.rules.trim() === "") {
                return null;
            }
            obj.rules = obj.rules.replace("|", "");
            return obj;
        };
        /**
         *
         */
        Validator.prototype.processAttribute = function (elType, attr, objToFill) {
            var attrName = this.processAttributeName(elType, attr.name);
            objToFill.rules = objToFill.rules || "";
            for (var i in Attr) {
                if (this.compare(attrName, i)) {
                    if (attrName === "rules") {
                        objToFill.rules = (attr.value === "" ? '' : attr.value);
                    }
                    else {
                        objToFill[i] = attr.value;
                    }
                }
                ;
            }
            for (var i in Rules) {
                if (this.compare(attrName, i)) {
                    objToFill.rules += '|' + (attrName + (attr.value === "" ? '' : '[' + attr.value + ']'));
                }
                ;
            }
            return objToFill;
        };
        /**
         *
         */
        Validator.prototype.processAttributeName = function (elType, attr) {
            attr = attr.replace("data-", "");
            var rm = ruleMap[elType] || ruleMap["default"];
            attr = Rules[rm[attr]] || attr;
            return attr.toLowerCase();
        };
        /**
         *
         */
        Validator.prototype.compare = function (attr, rule) {
            attr = this.convertSnakeCase(attr);
            var ruleName = this.convertSnakeCase(rule);
            //console.log(attr, ruleName);
            if (ruleName === attr) {
                return true;
            }
            return false;
        };
        /**
         *
         */
        Validator.prototype.convertSnakeCase = function (str) {
            return str.replace(/_/g, '-');
        };
        Validator.prototype.mergeFields = function (inlineFields, fields) {
            var merged = inlineFields;
            FIELD_MERGE: for (var i = 0; i < fields.length; ++i) {
                var field = fields[i];
                for (var n = 0; n < inlineFields.length; ++n) {
                    if (field.name === inlineFields[n].name) {
                        continue FIELD_MERGE;
                    }
                }
                merged.push(field);
            }
            return merged;
        };
        return Validator;
    })();
    xvalidatejs.Validator = Validator;
})(xvalidatejs || (xvalidatejs = {}));
//# sourceMappingURL=xvalidate.js.map