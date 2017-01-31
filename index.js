module.exports = {
    PollForNewConfigs: PollForNewConfigs
};

const s3 = require('s3');
const path = require("path");
const baseFolder = path.dirname(module.parent.filename);
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync(path.join(baseFolder, "package.json"), 'utf8'));
const majorVersion = "v" + pkg.version.substr(0, pkg.version.indexOf("."));
const appName = pkg.name;
const _ = require("lodash");
const async = require("async");

try {
    var configHash = fs.readFileSync(path.join(baseFolder, "config.hash"), 'utf8');
} catch (err) {}

var mappingHash;
var client;

const s3Config = JSON.parse(fs.readFileSync(path.join(baseFolder, "s3.json")));

function PollForNewConfigs(done) {
    if (!_.isEmpty(s3Config.s3Options)) {
        client = s3.createClient({
            s3Options: s3Config.s3Options
        });
    } else {
        client = s3.createClient();
    }

    downloadConfigs(done);
    if (pollTimer) {
        clearInterval(pollTimer);
    }
    pollTimer = setInterval(downloadConfigs, 60000);

}

let pollTimer;
//This function downloads and processes the configurations from our S3 bucket.
function downloadConfigs(done) {
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
            mappingHash = _.find(manifest.mappings, {
                configVersion: majorVersion
            }).hash;
            if (mappingHash === configHash) {
                if (done) {
                    done(); // Configs are up-to-date.
                }
                return;
            }
            return cb(null);
        },
        (cb) => {
            return downloadS3Dir(configsPath, s3Config.bucket, remoteConfigs, cb);
        },
        (configs, cb) => {
            fs.writeFile(path.join(baseFolder, "config.hash"), mappingHash, 'utf8', function() {
                if (done) {
                    return done();
                } else {
                    console.log("Bouncing server to finalize config change. If you want to handle this differently, please add a callback to PollForNewConfigs.");
                    process.exit(0);
                }
            });
        }
    ], (err) => {
        if (done){
            if (err.message === 'http status code 404') { // Ignore download errors if they haven't configured a config yet.
                return done();
            }

            if (err) {
                console.error(err);
                return done(err);
            }
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