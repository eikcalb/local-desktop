import * as express from "express";


export default function setupExpress() {
    let app: express.Express = express()

    app.use(express.urlencoded())
    app.use(express.json());

    // app.use((req, res, next) => {
    //     body = req.body
    //     next()
    // })
    // app.use(express.static('/'))
    app.get('/', (req: any, res: any) => {
        res.status(200).send("<p>lagbaja<p>").end();
    })

    app.get('/webhook', (req: any, res: any) => {
        const TOKEN_VERIFY = 'lord'
        let mode = req.query['hub.mode'];
        let token = req.query['hub.verify_token'];
        let challenge = req.query['hub.challenge'];
        if (mode && token) {

            // Checks the mode and token sent is correct
            if (mode === 'subscribe' && token === TOKEN_VERIFY) {

                // Responds with the challenge token from the request
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge).end();

            } else {
                // Responds with '403 Forbidden' if verify tokens do not match
                res.sendStatus(403).end();
            }
        }

    })
    app.post('/webhook', (req: any, res: any) => {
    })

    return app
}