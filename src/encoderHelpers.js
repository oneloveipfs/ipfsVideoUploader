const ffmpeg = require('fluent-ffmpeg')
const Shell = require('shelljs')
const fs = require('fs')

const encoderOptions = [
    '-hls_time 5',
    '-hls_list_size 0',
    '-segment_time 10',
    '-segment_format mpegts',
    '-f segment'
]

const hlsBandwidth = {
    4320: 20000000,
    2160: 6000000,
    1440: 4000000,
    1080: 2000000,
    720: 1256000,
    480: 680000,
    240: 340000
}

let helpers = {
    getHlsBw: (q) => hlsBandwidth[q],
    getHlsQList: () => Object.keys(hlsBandwidth),
    getFFprobeVideo: (filepath) => {
        return new Promise((rs,rj) => {
            ffmpeg.ffprobe(filepath,(e,probe) => {
                if (e)
                    return rj(e)
                let width, height, duration, orientation
                for (s in probe.streams)
                    if (probe.streams[s].codec_type === 'video') {
                        width = probe.streams[s].width,
                        height = probe.streams[s].height,
                        duration = probe.format.duration
                        if (width > height)
                            orientation = 1 // horizontal
                        else
                            orientation = 2 // square or vertical
                        break
                    }
                return rs({ width, height, duration, orientation })
            })
        })
    },
    recursiveFileCount: (dir) => {
        let c = fs.readdirSync(dir).filter((v) => !v.startsWith('.'))
        let l = c.length
        for (let f in c)
            if (fs.lstatSync(dir+'/'+c[f]).isDirectory())
                l += helpers.recursiveFileCount(dir+'/'+c[f])
        return l
    },
    createSpriteInContainer: (filepath, destDir) => {
        return new Promise((rs) => Shell.exec(__dirname+'/../scripts/dtube-sprite.sh ' + filepath + ' ' + destDir+'/sprite.jpg',(exitCode) => rs(exitCode === 0)))
    },
    determineOutputs: (width,height,possibleOutputs = []) => {
        let outputResolutions = []
        let sedge = Math.min(width,height)
        for (let q in possibleOutputs)
            if (helpers.getHlsBw(possibleOutputs[q]) && sedge >= possibleOutputs[q])
                outputResolutions.push(possibleOutputs[q])
        if (outputResolutions.length === 0 && possibleOutputs.length > 0)
            outputResolutions.push(possibleOutputs[possibleOutputs.length-1])
        outputResolutions = outputResolutions.sort((a,b) => a-b)
        return outputResolutions
    },
    hlsEncode: (id, filepath, orientation, encoder, quality, outputResolutions, createSprite, destDir, threads, onProgress, onError) => {
        const ffmpegbase = ffmpeg(filepath)
            .videoCodec(encoder)
            .audioCodec('aac')
        const ops = {}
        for (let r in outputResolutions) {
            let resolution = outputResolutions[r]
            ops[resolution] = (cb) =>
                ffmpegbase.clone()
                    .output(destDir+'/'+resolution+'p/%d.ts')
                    .audioBitrate('256k')
                    .addOption(encoderOptions)
                    .addOption(quality)
                    .addOption('-threads '+threads)
                    .addOption('-segment_list',destDir+'/'+resolution+'p/index.m3u8')
                    .size(orientation === 1 ? '?x'+resolution : resolution+'x?')
                    .on('progress',(p) => {
                        onProgress(id, resolution, p)
                    })
                    .on('error',(e) => {
                        onError(id, resolution, e)
                        cb(e)
                    })
                    .on('end',() => cb(null))
                    .run()
        }
        if (createSprite)
            ops.sprite = (cb) => helpers.createSpriteInContainer(filepath,destDir).then((success) => cb(null,{success}))
        return ops
    },
    hlsThumbnail: (fname, srcDir, destDir) => {
        let hasThumbnail = false
        if (helpers.isValidImgFname(fname) && fs.existsSync(srcDir+'/'+fname)) {
            fs.copyFileSync(srcDir+'/'+fname,destDir+'/thumbnail.jpg')
            hasThumbnail = true
        }
        return hasThumbnail
    },
    createMasterPlaylist: async (dir,outputResolutions = []) => {
        let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3'
        for (let r in outputResolutions) {
            let rd
            try {
                rd = await helpers.getFFprobeVideo(dir+'/'+outputResolutions[r]+'p/index.m3u8')
            } catch {
                return { success: false, error: 'could not retrieve ffprobe info on '+outputResolutions[r]+'p encoded video' }
            }
            masterPlaylist += '\n#EXT-X-STREAM-INF:BANDWIDTH='+hlsBandwidth[outputResolutions[r]]+',RESOLUTION='+rd.width+'x'+rd.height+'\n'+outputResolutions[r]+'p/index.m3u8'
        }
        fs.writeFileSync(dir+'/default.m3u8',masterPlaylist)
        return { success: true, error: null }
    },
    addHlsToIPFS: async (api, globSource, dir, id, onProgress) => {
        let folderhash, spritehash
        let addProgress = {
            progress: 0,
            total: helpers.recursiveFileCount(dir+'/'+id) + 1
        }
        for await (const f of api.addAll(globSource(dir,id+'/**'),{cidVersion: 0, pin: true})) {
            if (f.path.endsWith(id))
                folderhash = f
            else if (f.path.endsWith('sprite.jpg'))
                spritehash = f.cid.toString()
            addProgress.progress += 1
            onProgress(addProgress)
        }
        if (!folderhash || !folderhash.cid)
            return { error: 'HLS container IPFS add failed' }
        else
            return { error: null, folderhash, spritehash }
    },
    isValidImgFname: (filename = '') => {
        const imgFilenameChars = 'abcdef0123456789'
        const imgFilenameLength = 32
        if (filename.length === imgFilenameLength) {
            for (let c in filename)
                if (imgFilenameChars.indexOf(filename[c]) === -1)
                    return false
            return true
        } else
            return false
    }
}

module.exports = helpers