function myTrim(str){
    if(typeof str !=='string')str=String(str)
    
    return str.replace(/^\s+|\s+/g,'')
}

console.log(myTrim('   fdd   f '))