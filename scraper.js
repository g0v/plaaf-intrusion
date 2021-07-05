const axios = require('axios').default
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')
const readline = require('readline')

function datetime(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const h = date.getHours()
  const mm = ('0' + date.getMinutes()).slice(-2)
  const ss = ('0' + date.getSeconds()).slice(-2)
  return `${y}/${m}/${d} ${h}:${mm}:${ss}`
}

function wait(s) {
  return new Promise(resolve => setTimeout(() => resolve(), s * 1000))
}

async function getListedURLs() {
  let html
  try {
    const base = 'https://www.mnd.gov.tw/PublishTable.aspx'
    const params = { Types: '即時軍事動態', title: '國防消息', Page: 1 }
    const result = await axios.get(base, { params })
    html = result.data
  } catch(e) {
    console.log(e)
  }
  if(html) {
    const $ = cheerio.load(html)
    const viewState = $('input[name=__VIEWSTATE]').attr('value')
    const rows = $('table.newstitles').find('tr').map((i, row) => {
      const cols = $(row).find('td')
      const dateString = cols.eq(0).text()
      const a = cols.eq(1).find('a')
      const aID = a.attr('id')
      const aTitle = a.attr('title')
      const [f, target] = a.attr('href').match(/__doPostBack\('([^']*)','([^']*)'\)/)
      return {
        dateString,
        aID,
        aTitle,
        target
      }
    }).toArray()
    console.log(rows)
    console.log(viewState)

    // get report url
  }
}

// getListedURLs()

const dest = path.resolve(__dirname, 'data/reports.jsonl')

async function readReports() {
  // https://stackoverflow.com/questions/6156501/read-a-file-one-line-at-a-time-in-node-js
  const fileStream = fs.createReadStream(dest)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity // NOTE: use crlfDelay option to recognize all instances of CR LF ('\r\n') in input.txt as a single line break
  })

  const pidList = []
  const reportList = []
  for await (const line of rl) {
    const report = JSON.parse(line)
    pidList.push(report.p)
    reportList.push(report)
  }
  return [
    pidList,
    reportList
  ]
}

const aboutPLAAFInstrusion = [
  '西南空域',
  '西南防空識別區'
]

async function bruteForceInRangeURLs(max = 78854) {
  const [ pidList ] = await readReports()
  const pidMin = Math.min(...pidList)
  const pidMax = Math.max(...pidList)
  console.log(pidList.length, 'reports pID from', pidMin, 'to', pidMax)

  const min = pidMax
  console.log(max, 'max')
  console.log(max - min, 'urls to try...')

  for(let p = min + 1; p <= max; p++) {
    console.log(p)
    const time = new Date()
    let url, html
    try {
      const base = 'https://www.mnd.gov.tw/Publish.aspx'
      const params = { SelectStyle: '即時軍事動態', title: '國防消息', p }
      url = base + '?' + Object.keys(params).map(k => k + '=' + params[k]).join('&')

      const result = await axios.get(base, { params })
      html = result.data
    } catch(e) {
      console.error(e)
    }
    if(html) {
      const $ = cheerio.load(html)
      const page = $('.thisPages')
      const title = page.find('.title > .titleContent').text().trim()
      if(aboutPLAAFInstrusion.some(s => title.includes(s))) {
        const text = page.text().trim().split('\n').map(l => l.trim().replace(/\s\s+/g, ' ')).filter(l => l.length > 0).join('\n')
        const publishedAt = page.find('.title > .date').text().trim()
        const title = page.find('.title > .titleContent').text().trim()
        const links = page.find('a').map((i, el) => {
          const $el = $(el)
          const href = $el.attr('href')
          const text = $el.text().trim()
          return { text, href }
        }).toArray()
        console.log(publishedAt, title)
        const result = {
          p,
          url,
          publishedAt,
          archivedAt: datetime(time),
          title,
          links,
          text
        }
        fs.appendFileSync(dest, JSON.stringify(result) + '\n')
      } else {
        console.log('Not about PLAAF intrusion')
      }
    } else {
      console.log('No response data')
    }
    await wait(1)
  }

  const [ pidList2 ] = await readReports()
  const d = pidList2.length - pidList.length
  console.log(d, 'new reports')
  fs.appendFileSync('log', [min, max, d].join(' ') + '\n')
}

const args = process.argv.slice(2)
const max = parseInt(args[0])
if(!isNaN(max)) {
  bruteForceInRangeURLs(max)
}
