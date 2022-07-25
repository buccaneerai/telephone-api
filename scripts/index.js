const path = require('path');
const {Command} = require('commander');
const dotenv = require('dotenv');

const testPhoneCall = require('./testPhoneCall');
const fetchRecording = require('./fetchRecording');
const simulateInputStream = require('./simulateInputStream');

dotenv.config({path: path.resolve(__dirname, '../../../.env')});

const program = new Command();

// node ./bin/code-generators/generateScaffold --help
// program
//   .command('scaffold <resourceName> [fields...]')
//   .description('generates end-to-end boilerplate code for a resource. Example: generate scaffold blogPost title:String! authors:[ID]! likeCount:Int someNumber:Number isAwesome:Boolean')
//   .option('-d, --debug', 'output extra debugging')
//   .option('--plural-form <pluralForm>', 'the plural form of the resource name (defaults to adding an "s")')
//   .option('--dry-run', 'write output to console instead of files')
//   // .option('-w --without', 'model, create, remove, delete, update')
//   // .option('-f --force', 'overwrite existing files')
//   .action((resourceName, fields, options) => (
//     generateScaffold({name: resourceName, fields, ...options}))
//   );

program
  .command('call <phoneNumberTo>')
  .option('--from <phoneNumberFrom>', 'Ex: +17345678910', process.env.TWILIO_PHONE_NUM)
  .option('--account-sid <accountSid>', 'Twilio account SID', process.env.TWILIO_ACCOUNT_ID)
  .option('--api-key <apiKey>', 'Twilio account SID', process.env.TWILIO_API_KEY)
  .option('--api-secret <apiSecret>', 'Twilio account SID', process.env.TWILIO_API_SECRET)
  .option('--twiml <twiml>', 'XML for TwiML instructions', '<Response><Say>Ahoy, World!</Say></Response>')
  .option('-r, --record', 'Use this flag to record the call')
  .action((phoneNumberTo, options) => testPhoneCall({phoneNumberTo, ...options}))

program
  .command('download-audio <callSid> <filePathOut>')
  .option('--account-sid <accountSid>', 'Twilio account SID', process.env.TWILIO_ACCOUNT_ID)
  .option('--api-key <apiKey>', 'Twilio account SID', process.env.TWILIO_API_KEY)
  .option('--api-secret <apiSecret>', 'Twilio account SID', process.env.TWILIO_API_SECRET)
  .action((callSid, filePathOut) => fetchRecording({callSid, filePathOut}))

program
  .command('simulate')
  .description('Connects to WebSocket API and streams input audio data')
  .option('-u, --url <url>', 'URL of Websocket Server', `ws://localhost:${process.env.PORT}`)
  .option('-t, --token <callStreamToken>', 'Token for the callStream')
  .option('--id <', )
  .option(
    '-i, --input <filePathIn>',
    'Raw MULAW file (no headers, 8000Hz, 8-bit depth, 1 channel) to use as input data',
    path.resolve(__dirname, '../audio-samples/doctor-convo.ulaw')
  )
  .action(options => simulateInputStream({...options}));

program.parse(process.argv);
