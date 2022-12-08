const async = require('async')
const encoder = require('./encoderHelpers')
const fs = require('fs')
const config = require('./config')

module.exports = async (jobid,filepath,evt) => {
    let { width, height, duration, orientation } = await encoder.getFFprobeVideo(filepath)
    if (!width || !height || !duration || !orientation)
        return evt('self_encode_error',{ id: jobid, error: 'failed to ffprobe video info' })

    let outputResolutions = encoder.determineOutputs(width,height,config.Encoder.outputs)
    const defaultDir = process.env.ONELOVEIPFS_DATA_DIR || require('os').homedir() + '/.oneloveipfs'

    // Overwrite if exists
    if (fs.existsSync(defaultDir+'/'+jobid))
        fs.unlinkSync(defaultDir+'/'+jobid)

    // Create folders
    fs.mkdirSync(defaultDir+'/'+jobid)
    for (let r in outputResolutions)
        fs.mkdirSync(defaultDir+'/'+jobid+'/'+outputResolutions[r]+'p')

    const ops = encoder.hlsEncode(
        jobid,filepath,
        orientation,
        config.Encoder.encoder,
        config.Encoder.quality,
        outputResolutions,
        false,
        defaultDir+'/'+jobid,
        config.Encoder.threads,
        (id, resolution, p) => {
            evt('self_encode_progress',{
                id: id,
                job: 'encode',
                resolution: resolution,
                frames: p.frames,
                fps: p.currentFps,
                progress: p.percent
            })
            console.log('ID '+id+' - '+resolution+'p --- Frames: '+p.frames+'   FPS: '+p.currentFps+'   Progress: '+p.percent.toFixed(3)+'%')
        },
        (id, resolution, e) => {
            console.error(id+' - '+resolution+'p --- Error',e)
            evt('self_encode_error',{ id: id, error: resolution + 'p resolution encoding failed' })
        })
    evt('self_encode_step',{
        id: jobid,
        step: 'encode',
        outputs: outputResolutions
    })
    async.parallel(ops,() => {
        // post processing
        let total = 0
        for (let o in outputResolutions)
            total += fs.readdirSync(defaultDir+'/'+jobid+'/'+outputResolutions[o]+'p').length
        evt('self_encode_step',{
            id: jobid,
            step: 'upload',
            outputs: outputResolutions,
            totalFiles: total
        })
        // register self encode upload in renderer
    })
}