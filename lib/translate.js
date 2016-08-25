/**
 * Created by macdja38 on 2016-07-08.
 * Implementation based on http://jaysoo.ca/2014/03/20/i18n-with-es6-template-strings/
 */
"use strict";

// Matches optional type annotations in i18n strings.
// e.g. i18n`This is a number ${x}:n(2)` formats x as number
//      with two fractional digits.
const typeInfoRegex = /^:([a-z])(\((.+)\))?/;

var fs = require('fs');

var packs = {};

fs.readdir("../translations/", function (err, folders) {
    if (err) {
        onError(err);
        return;
    }
    folders.forEach(function (folder) {
        console.log(`folder ${folder}`);
        fs.readdir("../translations/" + folder, function (err, files) {
            if (err) {
                onError(err);
                return;
            }
            packs[folder] = {};
            files.forEach(function (filename) {
                let file = require("../translations/" + folder + "/" + filename);
                for(let key in file) {
                    if(file.hasOwnProperty(key)) {
                        packs[folder][key] = file[key];
                    }
                }
            });
            console.log(packs);
        });
    });
});


let I18n = {
    use({locale, defaultCurrency, messageBundle}) {
        I18n.locale = locale;
        I18n.defaultCurrency = defaultCurrency;
        I18n.messageBundle = messageBundle;
        return I18n.translate;
    },

    translate(literals, ...values) {
        let translationKey = I18n._buildKey(literals);
        let translationString = I18n.messageBundle[translationKey];

        if (translationString) {
            let typeInfoForValues = literals.slice(1).map(I18n._extractTypeInfo);
            let localizedValues = values.map((v, i) => I18n._localize(v, typeInfoForValues[i]));
            return I18n._buildMessage(translationString, ...localizedValues);
        }

        return 'Error: translation missing!';
    },

    _localizers: {
        s /*string*/: v => v.toLocaleString(I18n.locale),
        c /*currency*/: (v, currency) => (
            v.toLocaleString(I18n.locale, {
                style: 'currency',
                currency: currency || I18n.defaultCurrency
            })
        ),
        n /*number*/: (v, fractionalDigits) => (
            v.toLocaleString(I18n.locale, {
                minimumFractionDigits: fractionalDigits,
                maximumFractionDigits: fractionalDigits
            })
        )
    },

    _extractTypeInfo(literal) {
        let match = typeInfoRegex.exec(literal);
        if (match) {
            return {type: match[1], options: match[3]};
        } else {
            return {type: 's', options: ''};
        }
    },

    _localize(value, {type, options}) {
        return I18n._localizers[type](value, options);
    },

    // e.g. I18n._buildKey(['', ' has ', ':c in the']) == '{0} has {1} in the bank'
    _buildKey(literals) {
        let stripType = s => s.replace(typeInfoRegex, '');
        let lastPartialKey = stripType(literals[literals.length - 1]);
        let prependPartialKey = (memo, curr, i) => `${stripType(curr)}{${i}}${memo}`;

        return literals.slice(0, -1).reduceRight(prependPartialKey, lastPartialKey);
    },

    // e.g. I18n._formatStrings('{0} {1}!', 'hello', 'world') == 'hello world!'
    _buildMessage(str, ...values) {
        return str.replace(/{(\d)}/g, (_, index) => values[Number(index)]);
    }
};

// Usage
let messageBundle_fr = {
    'Hello {0}, you have {1} in your bank account.': 'Bonjour {0}, vous avez {1} dans votre compte bancaire.'
};

let messageBundle_de = {
    'Hello {0}, you have {1} in your bank account.': 'Hallo {0}, Sie haben {1} auf Ihrem Bankkonto.'
};

let messageBundle_zh_Hant = {
    'Hello {0}, you have {1} in your bank account.': '你好{0}，你有{1}在您的銀行帳戶。'
};

let name = 'Bob';
let amount = 1234.56;
let i18n;

i18n = I18n.use({locale: 'fr-CA', defaultCurrency: 'CAD', messageBundle: messageBundle_fr});
console.log(i18n `Hello ${name}, you have ${amount}:c in your bank account.`);

i18n = I18n.use({locale: 'de-DE', defaultCurrency: 'EUR', messageBundle: messageBundle_de});
console.log(i18n `Hello ${name}, you have ${amount}:c in your bank account.`);

i18n = I18n.use({locale: 'zh-Hant-CN', defaultCurrency: 'CNY', messageBundle: messageBundle_zh_Hant});
console.log(i18n `Hello ${name}, you have ${amount}:c in your bank account.`);
