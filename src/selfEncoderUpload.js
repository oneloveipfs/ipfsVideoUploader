const tus = require('tus-js-client')
const fs = require('fs')
const config = require('./config')
const { tusError } = require('./spk')
const defaultDir = process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs'

module.exports = (encodeId,uploadId,token,outputs,threads,endpoint,evt) => {
    uploadOutputs(token,encodeId,uploadId,endpoint,outputs,threads,(success) => evt('self_encode_upload_result',{ success }))
}

async function uploadOutputs(token, encodeId, uploadId, endpoint, outputs = [], threads = 10, cb = () => {}) {
    console.log('uploadOutputs',arguments)
    if (outputs.length === 0)
        return cb(true)
    let r = await uploadOutput(token, encodeId, uploadId, endpoint, outputs[0], threads)
    outputs.shift()
    if (!r)
        return cb(false)
    uploadOutputs(token,encodeId,uploadId,outputs,cb)
}

async function uploadOutput(token, encodeId, uploadId, endpoint, output, threads) {
    console.log('uploadOutput',arguments)
    let files = fs.readdirSync(defaultDir+'/'+encodeId+'/'+output+'p')
    for (let f in files)
        try {
            await uploadOne(token,uploadId,endpoint,output,defaultDir+'/'+encodeId+'/'+output+'p/'+files[f],files[f],threads)
        } catch {
            return false
        }
    return true
}

function uploadOne(token, id, endpoint, output, dir = '', file = '', threads = 10) {
    console.log('uploadOne',arguments)
    return new Promise((rs,rj) => {
        let upload = new tus.Upload(fs.createReadStream(dir),{
            endpoint: endpoint,
            retryDelays: [0,3000,5000,10000,20000],
            parallelUploads: threads,
            headers: {
                'Authorization': 'Bearer '+token
            },
            metadata: {
                type: 'hlsencode',
                selfEncode: 'true',
                encodeID: id,
                idx: file.endsWith('.ts') ? parseInt(file.replace('.ts','')) : -1,
                output: output
            },
            onError: (e) => {
                rj(tusError(e))
            },
            onProgress: (bu,bt) => {
                let progressPercent = Math.round((bu / bt) * 100)
                console.log(id,output,file,'progress: ' + progressPercent + '%')
            },
            onSuccess: () => {
                rs(true)
            }
        })
        upload.findPreviousUploads().then((p) => {
            if (p.length > 0)
                upload.resumeFromPreviousUpload(p[0])
            upload.start()
        })
    })
}