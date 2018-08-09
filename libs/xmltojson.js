/**
 * 2017/3/22
 * 先凑合用吧,没经太仔细调试
    @update 2017/11/11
    childvalue!==undefined 这些东东
 * **/

var DOMParser = require('xmldom').DOMParser;

var nodetoJSON=function(childNodes){
    //return node.tagName
    if(!childNodes){
        return undefined;
    }
    var firstChild=childNodes[0];

    var obj,is_array=false;
    if(!firstChild){
        return '';
    }
    //console.log(firstChild)
    if(firstChild.tagName){
        if(firstChild.tagName.toLowerCase()=='i'){
            obj=[];
            is_array=true;
        }else{
            obj={};
        }
    }else if(childNodes.length==1){
        //只有一个文本节点
        return firstChild.nodeValue
    }else{

        return nodetoJSON([].slice.call(childNodes,1));
    }

    for(var i= 0,child;child=childNodes[i++];){
        if(is_array){
            var childvalue=nodetoJSON(child.childNodes);
            if(childvalue!==undefined){
                obj.push(childvalue)
            }
            
        }else if(child.tagName){

            obj[child.tagName.toLowerCase()]=nodetoJSON(child.childNodes);
        }
    }
    return obj
};
module.exports=function(xmlstr){
    var doc = new DOMParser().parseFromString('<root>'+xmlstr.replace(/\>\s+\</g,'><')+'</root>', 'text/xml');

    return nodetoJSON(doc.firstChild.childNodes);
}