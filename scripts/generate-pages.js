// HTML page generator for markdown documentations

const fs = require('fs')
const { marked } = require('marked')
const template = fs.readFileSync(__dirname+'/../client/docs.html','utf-8')
const title = 'OneLoveIPFS Uploader'

// doc/?.md file -> client/generated/?.html
const map = [
    ['Privacy.md','privacy.html','Privacy Policy'],
    ['Terms.md','terms.html','Terms of Service'],
    ['FAQ.md','faq.html','FAQ']
]

const baseRepo = __dirname+'/..'
const srcFolder = baseRepo+'/docs'
const targetFolder = baseRepo+'/client/generated'

// setup
if (fs.existsSync(targetFolder)) {
    if (!fs.statSync(targetFolder).isDirectory()) {
        fs.rmSync(targetFolder)
        fs.mkdirSync(targetFolder)
    } else
        for (let f in map)
            if (fs.existsSync(targetFolder+'/'+map[f][1]))
                fs.rmSync(targetFolder+'/'+map[f][1])
} else
    fs.mkdirSync(targetFolder)

// generate
for (let f in map) {
    let result = marked.parse(fs.readFileSync(srcFolder+'/'+map[f][0],'utf-8'))
    fs.writeFileSync(
        targetFolder+'/'+map[f][1],template
            .replace('<div class="docs"></div>','<div class="docs">'+result+'</div>')
            .replace('<title></title>','<title>'+map[f][2]+' - '+title+'</title>')
        ,'utf-8'
    )
}