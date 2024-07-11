/*
import dotenv from 'dotenv'
dotenv.config()
import PouchDB from 'pouchdb'

import { couchdbUpdate, getPIN, signRequest } from './core-temp.js'
import objectPath from 'object-path'
/*
ENV VARS:
COUCHDB_ENCRYPT_PIN
NOSH_ROLE
INSTANCE
TRUSTEE_URL

const GnapAuth = async (req, res) => {
    var pin = process.env.COUCHDB_ENCRYPT_PIN
    var prefix = ''
    if (process.env.INSTANCE === 'digitalocean' && process.env.NOSH_ROLE === 'patient') {
      prefix = req.body.patient + '_'
      pin = await getPIN(req.body.patient)
    }
    if (!pin) {
      res.status(401).send('Unauthorized - No PIN set')
    } else {
      await couchdbUpdate(req.body.patient, req.protocol, req.hostname)
      const body = {
        "access_token": {
          "access": [
            {
              "type": "App",
              "actions": ["read", "write"],
              "locations": [req.protocol + "://" + req.hostname + "/app/chart/" + req.body.patient],
              "purpose": "Clinical - Routine"
            }
          ]
        },
        "interact": {
          "start": ["redirect"],
          "finish": {
            "method": "redirect",
            "uri": req.protocol + "://" + req.hostname + "/auth/gnapVerify/" + req.body.patient,
            "nonce": crypto.randomBytes(16).toString('base64url')
          }
        }
      }
      const signedRequest = await signRequest(body, '/api/as/tx', 'POST', req)
      try {
        const doc = await fetch(urlFix(process.env.TRUSTEE_URL) + 'api/as/tx', signedRequest)
          .then((res) => res.json());
        var db = new PouchDB(urlFix(settings.couchdb_uri) + prefix + 'gnap', settings.couchdb_auth)
        objectPath.set(doc, '_id', doc.interact.redirect.substring(doc.interact.redirect.lastIndexOf('/') + 1))
        objectPath.set(doc, 'nonce', objectPath.get(body, 'interact.finish.nonce'))
        objectPath.set(doc, 'route', req.body.route)
        objectPath.set(doc, 'patient', req.body.patient)
        await db.put(doc)
        res.status(200).json(doc)
      } catch (e) {
        res.status(401).json(e)
      }
    }
  }
  */
