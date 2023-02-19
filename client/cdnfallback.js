libs = []

switch (window.location.pathname) {
    case '/':
        libs = ['axios','hivesigner']
        break
    case '/reviews':
        libs = ['axios','hivesigner']
        break
    case '/upload':
        libs = ['axios','io','hivesigner','tus']
        break
}

for (let i = 0; i < libs.length; i++)
    if (!window[libs[i]]) document.write('<script src="/lib/' + libs[i] + '.min.js"><\/script>')