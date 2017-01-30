module.exports = {
    PollForNewConfigs: PollForNewConfigs
};

const s3 = require('s3');
const path = require("path");
const baseFolder = path.dirname(module.parent.filename);
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync(path.join(baseFolder, "package.json"), 'utf8'));
const majorVersion = "v"+pkg.version.substr(0, pkg.version.indexOf("."));
const appName = pkg.name;
const _ = require("lodash");
const async = require("async");

try {
var configHash = fs.readFileSync(path.join(baseFolder, "config.hash"), 'utf8');
} catch (err) {}

var mappingHash; 
var client;

const s3Config = JSON.parse(fs.readFileSync(path.join(baseFolder, "s3.json")));

<<<<<<< HEAD
function PollForNewConfigs () {
=======
function PollForNewConfigs(done) {
    console.log("polling for new configs");
>>>>>>> 179f07c... Added a callback for polling for configs
    if (!_.isEmpty(s3Config.s3Options)) {
        client = s3.createClient({s3Options: s3Config.s3Options});
    } else {
        client = s3.createClient();
    }

<<<<<<< HEAD
    downloadConfigs();
=======
    downloadConfigs(done);
>>>>>>> 179f07c... Added a callback for polling for configs
    if (pollTimer) {
        clearInterval(pollTimer);
    }
    pollTimer = setInterval(downloadConfigs, 60000);

}

let pollTimer;
//This function downloads and processes the configurations from our S3 bucket.
<<<<<<< HEAD
function downloadConfigs() {
=======
function downloadConfigs(done) {
    console.log("downloading new configs");
>>>>>>> 179f07c... Added a callback for polling for configs
    const manifestJsonPath = path.join(baseFolder, 'manifest.json');
    const remoteManifestJson = path.posix.join(s3Config.path, 'manifest.json');
    const configsPath = path.join(baseFolder, 'config');
    const remoteConfigs = path.posix.join(s3Config.path, majorVersion);
    return async.waterfall([
        (cb) => {
            return downloadS3File(manifestJsonPath, s3Config.bucket, remoteManifestJson, cb);
        },
        (cb) => {
            return fs.readFile(manifestJsonPath, 'utf8', cb);
        },
        (manifestContents, cb) => {
            let manifest = JSON.parse(manifestContents);
            mappingHash = _.find(manifest.mappings, { configVersion: majorVersion }).hash ;
            if (mappingHash === configHash) {
<<<<<<< HEAD
               return; // Configs are up-to-date.
=======
                console.log("Configs are up to date");
               return done(); // Configs are up-to-date.
>>>>>>> 179f07c... Added a callback for polling for configs
            }
            return cb(null);
        },
        (cb) => { 
            return downloadS3Dir(configsPath, s3Config.bucket, remoteConfigs, cb);
        },
        (configs, cb) => {
<<<<<<< HEAD
            fs.writeFile(path.join(baseFolder, "config.hash"), mappingHash, 'utf8', function(){
                console.log("Bouncing server to finalize config change.");
                process.exit(0);
=======
            console.log("Got configs");
            fs.writeFile(path.join(baseFolder, "config.hash"), mappingHash, 'utf8', function(){
                if (done) {
                    console.log("Had done callback, calling it now");
                    return done();
                } else {
                    console.log("Bouncing server to finalize config change.");
                    process.exit(0);
                }
>>>>>>> 179f07c... Added a callback for polling for configs
            });
        }
    ], (err) => {
        if (err){
<<<<<<< HEAD
            console.log(err);
=======
            console.error(err);
            return done(err);
>>>>>>> 179f07c... Added a callback for polling for configs
        }
    });
}

function downloadS3Dir(localPath, bucket, awsPath, cb) {
    const params = {
        localDir: localPath,
        s3Params: {
            Bucket: bucket,
            Prefix: awsPath
        },
        deleteRemoved: true //delete local files with no corresponding s3 object
    };
    const downloader = client.downloadDir(params);
    downloader.on('error', (err) => cb(err));
    downloader.on('end', () => cb(null));
}


function downloadS3File(localPath, bucket, awsPath, cb) {
    const params = {
        localFile: localPath,
        s3Params: {
            Bucket: bucket,
            Key: awsPath
        }
    };
    const downloader = client.downloadFile(params);
    downloader.on('error', (err) => cb(err));
    downloader.on('end', () => cb(null));
}
