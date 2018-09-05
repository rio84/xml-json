/**
 * Created by shelwin on 15-3-20.
 *
 * update by RIO84 2015/8/21

 20180814 解决　TypeError: node_data.toString is not a function
 */

//copyright Ryan Day 2010 <http://ryanday.org>, Joscha Feth 2013 <http://www.feth.com> [MIT Licensed]

var element_start_char =
    "a-zA-Z_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FFF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD";
var element_non_start_char = "\-.0-9\u00B7\u0300-\u036F\u203F\u2040";
var element_replace = new RegExp("^([^" + element_start_char + "])|^((x|X)(m|M)(l|L))|([^" + element_start_char + element_non_start_char + "])", "g");

var process_to_xml = function(node_data,options){

    var makeNode = function(name, content, attributes, level, hasSubNodes) {

        var indent_value = options.indent !== undefined ? options.indent : "\t";
        var indent = options.prettyPrint ? '\n' + new Array(level).join(indent_value) : '';
        if(options.removeIllegalNameCharacters) {
            name = name.replace(element_replace, '_');
        }

        var node = [indent, '<',name, (attributes || '')];
        if(content == undefined || content === false) {
            return '';
        } else {
            node.push('>')
            node.push(content);
            hasSubNodes && node.push(indent);
            node.push('</');
            node.push(name);
            node.push('>');

            //node.push('/>');
        }
        return node.join('');
    };

    return (function fn(node_data,node_descriptor, level){
        var type = typeof node_data;

        if((Array.isArray) ? Array.isArray(node_data) : node_data instanceof Array) {
            type = 'array';
        } else if(node_data instanceof Date) {
            type = 'date';
        }

        //console.log('node_data',node_data.toString(),node_data,node_data.constructor)
        if(type=='object' && node_data && node_data.constructor!=Object){
           
            //这一逻辑主要处理ObjectID这样的非数据对象(plainObject)
            type='string';
            node_data=node_data.toString?node_data.toString():'';
            
            
        }


        switch(type) {
            //if value is an array create child nodes from values
            case 'array':
                var ret = [],leftTag,rightTag,tagname='';
                if(!options.arrayTag){
                    if(options.arrayTag===undefined)
                        tagname='i';
                }else{
                    tagname=options.arrayTag;

                }
                if(tagname){
                    leftTag='<'+tagname+'>'
                    rightTag='<'+tagname+'>'
                }

                node_data.map(function(v){

                    ret.push('<i>' + fn(v,1, level+1) + '</i>');
                    //entries that are values of an array are the only ones that can be special node descriptors
                });
                options.prettyPrint && ret.push('\n');
                return ret.join('');
                break;

            case 'date':
                // cast dates to ISO 8601 date (soap likes it)
                return node_data.toJSON?node_data.toJSON():node_data+'';
                break;

            case 'object'://console.log(node_descriptor,node_data,'--------')
                var  attributes = [];
                    if(node_data&&node_data._attributes) {
                if(typeof node_data._attributes != 'object') {
                    // _attributes is a string, etc. - just use it as an attribute
                    attributes.push(' ');
                    attributes.push(node_data._attributes);
                } else {
                    for(var key in node_data._attributes){
                        var value = node_data._attributes[key];
                        attributes.push(' ');
                        attributes.push(key);
                        attributes.push('="')
                        attributes.push(options.escape ? esc(value) : value);
                        attributes.push('"');
                    }
                }
            }/** rio84@2016/2/21: node_data.name 的判断令人不太解，似乎是支持{name:xxx,value:xxx} 这种形式，我加上了 && false 这段，使之永不进入此逻辑 */
                if(node_descriptor == 1 && false && node_data.name){
                    var content = []
                        ;

                    //later attributes can be added here
                    if(typeof node_data.value != 'undefined') {
                        var c = ''+node_data.value;
                        content.push(options.escape ? esc(c) : c);
                    } else if(typeof node_data.text != 'undefined') {
                        var c = ''+node_data.text;
                        content.push(options.escape ? esc(c) : c);
                    }

                    if(node_data.children){
                        content.push(fn(node_data.children,0,level+1));
                    }

                    return makeNode(node_data.name, content.join(''), attributes.join(''),level,!!node_data.children);

                } else {
                    var nodes = [];
                    for(var name in node_data){
                        nodes.push(makeNode(name, fn(node_data[name],0,level+1),null,level+1));
                    }
                    options.prettyPrint && nodes.length > 0 && nodes.push('\n');
                    return nodes.join('');
                }
                break;

            case 'function':
                return node_data();
                break;
            case 'boolean':
                return node_data
            default:
                return options.escape ? esc(node_data) : ''+node_data;
        }

    }(node_data, 0, 0))
};


var xml_header = function(standalone) {
    var ret = ['<?xml version="1.0" encoding="utf-8"'];

    if(standalone) {
        ret.push(' standalone="yes"');
    }

    ret.push('?>');

    return ret.join('');
};

module.exports = function(obj,options){
    var Buffer = this.Buffer || function Buffer () {};

    if(typeof obj == 'string' || obj instanceof Buffer) {
        try{
            obj = JSON.parse(obj.toString());
        } catch(e){
            return cdata(obj);//无论是cdata，或是escape，似乎都可以，客户端显示为html
        }
    }

    var xmlheader = '';
    var docType = '';
    if(options) {
        if(typeof options == 'object') {
            // our config is an object

            if(options.xslLink){
                options.xmlHeader=true;
                xmlheader='<?xml-stylesheet type="text/xsl" href="'+options.xslLink+'"?>'
            }

            if(options.xmlHeader) {
                // the user wants an xml header
                xmlheader = xml_header(!!options.xmlHeader.standalone)+xmlheader;

            }

            if(typeof options.docType != 'undefined') {
                docType = '<!DOCTYPE '+options.docType+'>'
            }
        } else {
            // our config is a boolean value, so just add xml header
            xmlheader = xml_header();
        }
    }
    options = options || {}
    options.escape=true;
    var ret = [
        xmlheader,
        (options.prettyPrint && docType ? '\n' : ''),
        docType,
        process_to_xml(obj,options)
    ];

    return ret.join('');
}

module.exports.json_to_xml=
    module.exports.obj_to_xml = module.exports;

module.exports.escape = esc;

function esc(str){
    if(typeof str =='number'){
        return str;
    }
    if(!str)return '';
    return (''+str).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;');
}

module.exports.cdata = cdata;

function cdata(str){
    if(str) return "<![CDATA["+str.replace(/]]>/g,'')+']]>';
    return "<![CDATA[]]>";
};
