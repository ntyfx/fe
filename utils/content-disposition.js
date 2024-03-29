/*!
 * content-disposition
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

const Promise = require('bluebird');
const debug = require('debug')('utils-content-disposition');

/**
 * Module exports.
 */

module.exports = contentDisposition;
module.exports.parse = parse;

/**
 * Module dependencies.
 */

var basename = require('path').basename;

/**
 * RegExp to match non attr-char, *after* encodeURIComponent (i.e. not including "%")
 */

var ENCODE_URL_ATTR_CHAR_REGEXP = /[\x00-\x20"'\(\)*,\/:;<=>?@\[\\\]\{\}\x7f]/g; // eslint-disable-line no-control-regex

/**
 * RegExp to match percent encoding escape.
 */

var HEX_ESCAPE_REGEXP = /%[0-9A-Fa-f]{2}/;
var HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g;

/**
 * RegExp to match non-latin1 characters.
 */

var NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g;

/**
 * RegExp to match quoted-pair in RFC 2616
 *
 * quoted-pair = "\" CHAR
 * CHAR        = <any US-ASCII character (octets 0 - 127)>
 */

var QESC_REGEXP = /\\([\u0000-\u007f])/g;

/**
 * RegExp to match chars that must be quoted-pair in RFC 2616
 */

var QUOTE_REGEXP = /([\\"])/g;

/**
 * RegExp for various RFC 2616 grammar
 *
 * parameter     = token "=" ( token | quoted-string )
 * token         = 1*<any CHAR except CTLs or separators>
 * separators    = "(" | ")" | "<" | ">" | "@"
 *               | "," | ";" | ":" | "\" | <">
 *               | "/" | "[" | "]" | "?" | "="
 *               | "{" | "}" | SP | HT
 * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
 * qdtext        = <any TEXT except <">>
 * quoted-pair   = "\" CHAR
 * CHAR          = <any US-ASCII character (octets 0 - 127)>
 * TEXT          = <any OCTET except CTLs, but including LWS>
 * LWS           = [CRLF] 1*( SP | HT )
 * CRLF          = CR LF
 * CR            = <US-ASCII CR, carriage return (13)>
 * LF            = <US-ASCII LF, linefeed (10)>
 * SP            = <US-ASCII SP, space (32)>
 * HT            = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 */

var PARAM_REGEXP = /; *([!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) *= *("(?:[ !\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) */g;
var TEXT_REGEXP = /^[\x20-\x7e\x80-\xff]+$/;
var TOKEN_REGEXP = /^[!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+$/;

/**
 * RegExp for various RFC 5987 grammar
 *
 * ext-value     = charset  "'" [ language ] "'" value-chars
 * charset       = "UTF-8" / "ISO-8859-1" / mime-charset
 * mime-charset  = 1*mime-charsetc
 * mime-charsetc = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "%" / "&"
 *               / "+" / "-" / "^" / "_" / "`"
 *               / "{" / "}" / "~"
 * language      = ( 2*3ALPHA [ extlang ] )
 *               / 4ALPHA
 *               / 5*8ALPHA
 * extlang       = *3( "-" 3ALPHA )
 * value-chars   = *( pct-encoded / attr-char )
 * pct-encoded   = "%" HEXDIG HEXDIG
 * attr-char     = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "&" / "+" / "-" / "."
 *               / "^" / "_" / "`" / "|" / "~"
 */

var EXT_VALUE_REGEXP = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+\-\.^_`|~])+)$/;

/**
 * RegExp for various RFC 6266 grammar
 *
 * disposition-type = "inline" | "attachment" | disp-ext-type
 * disp-ext-type    = token
 * disposition-parm = filename-parm | disp-ext-parm
 * filename-parm    = "filename" "=" value
 *                  | "filename*" "=" ext-value
 * disp-ext-parm    = token "=" value
 *                  | ext-token "=" ext-value
 * ext-token        = <the characters in token, followed by "*">
 */

var DISPOSITION_TYPE_REGEXP = /^([!#$%&'\*\+\-\.0-9A-Z\^_`a-z\|~]+) *(?:$|;)/;

/**
 * Create an attachment Content-Disposition header.
 *
 * @param {string} [filename]
 * @param {object} [options]
 * @param {string} [options.type=attachment]
 * @param {string|boolean} [options.fallback=true]
 * @return {string}
 * @api public
 */

function contentDisposition(filename, options) {
    var opts = options || {};

    // get type
    var type = opts.type || 'attachment';

    // get parameters
    var params = createparams(filename, opts.fallback);

    // format into string
    return format(new ContentDisposition(type, params));
}

/**
 * Create parameters object from filename and fallback.
 *
 * @param {string} [filename]
 * @param {string|boolean} [fallback=true]
 * @return {object}
 * @api private
 */

function createparams(filename, fallback) {
    if (filename === undefined) {
        return;
    }

    var params = {};

    if (typeof filename !== 'string') {
        throw new TypeError('filename must be a string');
    }

    // fallback defaults to true
    if (fallback === undefined) {
        fallback = true;
    }

    if (typeof fallback !== 'string' && typeof fallback !== 'boolean') {
        throw new TypeError('fallback must be a string or boolean');
    }

    if (typeof fallback === 'string' && NON_LATIN1_REGEXP.test(fallback)) {
        throw new TypeError('fallback must be ISO-8859-1 string');
    }

    // restrict to file base name
    var name = basename(filename);

    // determine if name is suitable for quoted string
    var isQuotedString = TEXT_REGEXP.test(name);

    // generate fallback name
    var fallbackName = typeof fallback !== 'string' ?
        fallback && getlatin1(name) :
        basename(fallback);
    var hasFallback = typeof fallbackName === 'string' && fallbackName !== name;

    // set extended filename parameter
    if (hasFallback || !isQuotedString || HEX_ESCAPE_REGEXP.test(name)) {
        params['filename*'] = name;
    }

    // set filename parameter
    if (isQuotedString || hasFallback) {
        params.filename = hasFallback ?
            fallbackName :
            name;
    }

    return params;
}

/**
 * Format object to Content-Disposition header.
 *
 * @param {object} obj
 * @param {string} obj.type
 * @param {object} [obj.parameters]
 * @return {string}
 * @api private
 */

function format(obj) {
    var parameters = obj.parameters;
    var type = obj.type;

    if (!type || typeof type !== 'string' || !TOKEN_REGEXP.test(type)) {
        throw new TypeError('invalid type');
    }

    // start with normalized type
    var string = String(type).toLowerCase();

    // append parameters
    if (parameters && typeof parameters === 'object') {
        var param;
        var params = Object.keys(parameters).sort();

        for (var i = 0; i < params.length; i++) {
            param = params[i];

            var val = param.substr(-1) === '*' ?
                ustring(parameters[param]) :
                qstring(parameters[param]);

            string += '; ' + param + '=' + val;
        }
    }

    return string;
}

/**
 * Decode a RFC 6987 field value (gracefully).
 *
 * @param {string} str
 * @return {string}
 * @api private
 */

function decodefield(str) {
    var match = EXT_VALUE_REGEXP.exec(str);

    if (!match) {
        throw new TypeError('invalid extended field value');
    }

    var charset = match[1].toLowerCase();
    var encoded = match[2];
    var value;

    // to binary string
    var binary = encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode);

    switch (charset) {
        case 'iso-8859-1':
            value = getlatin1(binary);
            break;
        case 'utf-8':
            value = new Buffer(binary, 'binary').toString('utf8');
            break;
        default:
            throw new TypeError('unsupported charset in extended field');
    }

    return value;
}

/**
 * Get ISO-8859-1 version of string.
 *
 * @param {string} val
 * @return {string}
 * @api private
 */

function getlatin1(val) {
    // simple Unicode -> ISO-8859-1 transformation
    return String(val).replace(NON_LATIN1_REGEXP, '?');
}

/**
 * Parse Content-Disposition header string.
 *
 * @param {string} string
 * @return {object}
 * @api private
 */

function parse(string) {
    if (!string || typeof string !== 'string') {
        return ;
    }

    var match = DISPOSITION_TYPE_REGEXP.exec(string);

    if (!match) {
        throw new TypeError('invalid type format');
    }

    // normalize type
    var index = match[0].length;
    var type = match[1].toLowerCase();

    var key;
    var names = [];
    var params = {};
    var value;

    // calculate index to start at
    index = PARAM_REGEXP.lastIndex = match[0].substr(-1) === ';' ?
        index - 1 :
        index;

    // match parameters
    while ((match = PARAM_REGEXP.exec(string))) {
        if (match.index !== index) {
            throw new TypeError('invalid parameter format');
        }

        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];

        if (names.indexOf(key) !== -1) {
            throw new TypeError('invalid duplicate parameter');
        }

        names.push(key);

        if (key.indexOf('*') + 1 === key.length) {
            // decode extended value
            key = key.slice(0, -1);
            value = decodefield(value);

            // overwrite existing value
            params[key] = value;
            continue;
        }

        if (typeof params[key] === 'string') {
            continue;
        }

        if (value[0] === '"') {
            // remove quotes and escapes
            value = value
                .substr(1, value.length - 2)
                .replace(QESC_REGEXP, '$1');
        }

        params[key] = value;
    }

    if (index !== -1 && index !== string.length) {
        throw new TypeError('invalid parameter format');
    }

    return new ContentDisposition(type, params);
}

/**
 * Percent decode a single character.
 *
 * @param {string} str
 * @param {string} hex
 * @return {string}
 * @api private
 */

function pdecode(str, hex) {
    return String.fromCharCode(parseInt(hex, 16));
}

/**
 * Percent encode a single character.
 *
 * @param {string} char
 * @return {string}
 * @api private
 */

function pencode(char) {
    var hex = String(char)
        .charCodeAt(0)
        .toString(16)
        .toUpperCase();
    return hex.length === 1 ?
        '%0' + hex :
        '%' + hex;
}

/**
 * Quote a string for HTTP.
 *
 * @param {string} val
 * @return {string}
 * @api private
 */

function qstring(val) {
    var str = String(val);

    return '"' + str.replace(QUOTE_REGEXP, '\\$1') + '"';
}

/**
 * Encode a Unicode string for HTTP (RFC 5987).
 *
 * @param {string} val
 * @return {string}
 * @api private
 */

function ustring(val) {
    var str = String(val);

    // percent encode as UTF-8
    var encoded = encodeURIComponent(str)
        .replace(ENCODE_URL_ATTR_CHAR_REGEXP, pencode);

    return 'UTF-8\'\'' + encoded;
}

/**
 * Class for parsed Content-Disposition header for v8 optimization
 */

function ContentDisposition(type, parameters) {
    this.type = type;
    this.parameters = parameters;
}