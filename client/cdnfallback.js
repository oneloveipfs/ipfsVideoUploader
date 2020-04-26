libs = []

switch (window.location.pathname) {
    case '/':
        libs = ['axios','javalon','hivesigner']
        break
    case '/reviews':
        libs = ['axios','javalon','hivesigner']
        break
    case '/upload':
        libs = ['axios','javalon','async','io','hivesigner','steem','hivejs','HtmlSanitizer','tus','moment']
        break
}

for (let i = 0; i < libs.length; i++)
    if (!window[libs[i]]) document.write('<script src="/lib/' + libs[i] + '.min.js"><\/script>')