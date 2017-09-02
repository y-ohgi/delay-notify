const { exec } = require('child_process')
const ENV = process.env

const TARGET_ROUTES = (ENV.TARGET_ROUTES || '久大本線,山陰本線').split(',')

exports.handler = (event, context, callback) => {
  fetchTrainDelayApi()
    .then(json => {
      console.log("delay routes =====================")
      console.log(json)

      let hitroutes = []
      json.forEach((route) => {
        if( route.name.match(TARGET_ROUTES.join('|')) ) hitroutes.push(route.name)
      })


      console.log("toot message =====================")
      const msg = buildTootMsg(hitroutes)
      console.log(msg)
      
      toot(msg)
    })
    .then(stdout => callback(null, stdout))
    .catch(err => callback(err, null))
}

/***
 * 遅延情報の取得
 *   MEMO: https://rti-giken.jp/fhc/api/train_tetsudo/
 * 
 * @return {Object} 遅延中の路線情報
 */
const fetchTrainDelayApi = () => new Promise(
  (resolve, reject) => {
    exec('curl https://rti-giken.jp/fhc/api/train_tetsudo/delay.json', (err, stdout, stderr) => {
      if(err) reject(err)
      
      const json = JSON.parse(stdout)
      resolve(json)
    })
  }
)

/***
 * メッセージの組み立て
 *
 * @param {Array} hitroutes 遅延中の路線名が格納された配列
 * @return {String}
 */
const buildTootMsg = hitroutes => hitroutes.length ? `【遅延情報】\\n${hitroutes.join('\\n')}` : '【遅延情報】 \\n遅延している登録済みの路線はありません！'

/***
 * トゥートする
 * 
 * @param {String} msg トゥートしたいテキスト
 * @return {String}
 */
const toot = (msg) => new Promise(
  (resolve, reject) => {
    const cmd = `curl https://${ENV.MASTODON_HOST}/api/v1/statuses -X POST --header "Authorization: Bearer ${ENV.MASTODON_ACCESS_TOKEN}" --header "Content-Type: application/json" -d \'{"status":"${msg}"}\'`
    exec(cmd, (err, stdout, stderr) => {
      err ? reject(err) : resolve(stdout)
    })
  }
)
