# Medical AI Assistant Demo

This demonstration showcases the integration of OpenAI with [Trustee® Community](#software-repositories) and [NOSH](#software-repositories), enabling AI queries using a health Timeline as context. The demo utilizes the [GNAP (Grant Negotiation and Authorization Protocol)](https://ldapwiki.com/wiki/Wiki.jsp?page=Grant%20Negotiation%20and%20Authorization%20Protocol) for secure connections between components. You can view a [Demo Video Here](https://www.youtube.com/watch?v=V16lfEMN2eA&ab_channel=AdrianGropper).

## Overview

The primary purpose of this demo is to illustrate how a suite of open-source software, centered around the Trustee Authorization Server and the NOSH Resource Server, can be used to securely share health information from a patient-controlled Electronic Health Record (EHR) as system data in a conversation with an AI.

## Prerequisites

- An OpenAI API key (obtainable for free at [OpenAI's website](https://openai.com))

## Environment Variables

The MAIA App requires the following environment variables:

- `VITE_ORG_ID`: App ID. Can be any value.
- `VITE_PROJECT_ID`: Project ID. Can be any value.
- `VITE_OPENAI_API_KEY`: Your OpenAI API key.

Make sure to set these variables before running the MAIA App.

## Challenge Instructions

### Register for Challenge

1. Register using the [registration form](https://pages.pathcheck.org/patient-journey-challenge).
   This step is necessary to participate in the challenge and receive updates.

### Set up a patient record

1. Visit [trustee.health](https://trustee.health).
   This is the primary interface for managing your health data securely.

2. Enter your email address and click the "New to Trustee" link.
   This initiates the process of creating your Trustee account.

3. Verify your email address.
   You will receive an email with a verification code.

4. Create a passkey for login.
   Passkeys provide a secure, passwordless login method.

   - For Mac users: Passkeys are natively supported.
   - For Windows users: Follow the instructions [here](https://support.microsoft.com/en-us/account-billing/signing-in-with-a-passkey-09a49a86-ca47-406c-8acc-ed0e3c852c6d) to set up and use passkeys.

5. Receive link to NOSH record in email.
   After setting up your Trustee account, you'll receive an email with a link to access your NOSH record.

6. Click to access NOSH record.
   This will take you to your personal health record interface.

7. Click the Sync button (two circular arrows) and select one of the Synthetic Mass patients to import into NOSH.
   This step populates your record with sample health data for testing purposes.
   ![Sync button](https://github.com/abeuscher/vue-ai-example/blob/main/public/ss-1.png)

   ![Select Synthetic Record](https://github.com/abeuscher/vue-ai-example/blob/main/public/ss-4.png)

8. Click the Import Everything button (two up/down arrows) to add the contents to your health records Timeline.
   This action imports all available data from the selected Synthetic Mass patient into your Timeline.
   ![Import button](https://github.com/abeuscher/vue-ai-example/blob/main/public/ss-2.png)

### Try MAIA

1. Select "Launch MAIA" from side menu.
   This option is located in the main navigation menu of your NOSH interface.

   ![Launch MAIA](https://github.com/abeuscher/vue-ai-example/blob/main/public/ss-3.png)

2. Log into Trustee from MAIA.
   You'll need to authenticate again to ensure secure access to your health data.

3. Ask AI some questions about your Patient Timeline.
   Explore the capabilities of the AI by asking questions related to the imported health data.

### Troubleshooting

If the MAIA app experiences a failure, you may need to delete the cookies it sets during its function. MAIA sets two values:

- In SessionStorage, the value "gnap"
- In LocalStorage, the value "noshuri"

This should help the app to relaunch properly from NOSH.

### Change MAIA

1. The repo can be forked and added. Please see requirements above.
   This allows you to create your own version of MAIA for customization and development.

2. When you have a candidate, you can edit your MAIA URL in NOSH in order to test it against the app.
   This step enables you to integrate your custom MAIA version with the NOSH system for testing. Note: This change is made locally, so if you want to test on a separate machine, you will need to edit the MAIA url there as well. The data is saved to localStorage.

   ![Change MAIA URL](https://github.com/abeuscher/vue-ai-example/blob/main/public/ss-5.jpg)

## Participation Guidelines

1. Hosting: The MAIA app can be hosted for free on platforms like Netlify. Any similar host that can securely store secrets (like API keys) will work.

2. Local Testing:

   - You can test your submission locally by attaching markdown files in place of full timelines. This feature is accessible via the paperclip icon to the left of the chat box in the MAIA interface.
   - For a wider dataset, you can download a timeline locally from the current MAIA and use that for local testing.

3. Development:
   - Fork the MAIA code or use your own approach with the API endpoints available from the NOSH record.
   - To customize, edit the MAIA URL that opens from your EHR in your user settings in the NOSH interface.

## Important Notes

- The signup process for a patient (user) record takes approximately 5 minutes.
- Synthetic Mass patients contain realistic but synthetic health data for testing and development purposes.
- Ensure you follow all security and privacy best practices when handling health data, even if synthetic.

## Resources

### Software Repositories:

#### Patient-Centered Domain

- GNAP Resource Server: [https://github.com/shihjay2/nosh3](https://github.com/shihjay2/nosh3)
- GNAP Authorization Server: [https://github.com/HIEofOne/Trustee-Community](https://github.com/HIEofOne/Trustee-Community)
- W3C Verifiable Credentials and SMART on FHIR Support: [https://github.com/HIEofOne/Trustee-Proxy](https://github.com/HIEofOne/Trustee-Proxy)

#### MAIA Domain

- GNAP Client: [https://github.com/abeuscher/vue-ai-example](https://github.com/abeuscher/vue-ai-example)
- GNAP Client Support: [https://github.com/hieofOne/vue3-gnap](https://github.com/hieofOne/vue3-gnap)

For further instructions, details, and challenge specifics, please visit: [Challenge Details](https://pages.pathcheck.org/patient-journey-challenge)

## Contact

For questions or assistance, please contact: info@hieofone.com

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file in the root directory of this project for the full license text.
