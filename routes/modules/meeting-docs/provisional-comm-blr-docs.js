const { writeFileSync, readFileSync } = require("fs");
const moment = require("moment");
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_TO_AZURE_STORAGE } = require("../../../helpers");
const { CHECK_PERMISSIONS } = require("../../../helpers");
const { RatingCommitteeMeetingDocument } = require("../../../models/modules/rating-committee");
const { GET_PROV_COMM_BLR_DATA } = require("../../../repositories/ProvisionalCommBLRData");
const HTMLtoDOCX = require('html-to-docx');

async function provisional_comm_blr_docs_routes(fastify) {
  fastify.post('/prov_comm_blr/generate/docx', async (request, reply) => {
    try {

      await CHECK_PERMISSIONS(request, 'Rating.Letter')

      var document_url = ''

      const GENERATE_UUID = uuidv4();

      const path = `generated/prov_comm_blr_doc_${GENERATE_UUID}.docx`

      const { params } = request.body;

      const data = await GET_PROV_COMM_BLR_DATA({
        rating_committee_meeting_params: {
        uuid: params["rating_committee_meeting_uuid"],
        is_active: true
        }, company_params: {
        uuid: params["company_uuid"],
        is_active: true
        }})

      var header = `
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="UTF-8" />
      <title>Provisional Communication BLR Document</title>
      <head>
      <style>
        * {
        margin: 0;
        padding: 0;
        }
        body {
          font-family: 'Arial';
        }
        section {
          margin: 0 1.5rem;
        }
        .table-div{
          margin: 0 1rem;
        }
        table{
          width: 100%;
        }
        th, td{
          border: 1px solid black;
          text-align: left;
          padding: 8px;
        }
        .text-center{
          text-align: center;
        }
        .text-underline{
          text-decoration: underline;
        }
      </style>
      </head>
      <body>`

      var html = header
      html += `
      <main style="background-image: url('https://4i-ir.api.cognitensor.in/public/images/press_release_background_img.jpg') background-size: cover; width: 100%; height: 29.7cm; margin: 0; background-repeat: repeat;"> 
        <section>
          <p>Shri/Mr. ${data.prov_comm_blr_ratings[0].company_contact}</p>
          <p>${data.prov_comm_blr_ratings[0].designation}</p>
          <p>${data.prov_comm_blr_ratings[0].company_name}</p>
          <p>${data.prov_comm_blr_ratings[0].address_1}</p>
        </section></p>
    
        <h4 class="text-center text-underline">Request for Acceptance</h4>
        <section>
          <p>Dear Sir,</p>
          <br>
          <p>We have for reference the Mandate contract dated <strong>Month XX, 20XX signed by you for rating of Bank Facilities of your company. The Rating Committee of Infomerics has assigned the following ratings: </strong>
          </p>   
        </section>
        <br>
        <div class='table-div'> 
            <table>
              <thead>  
                <tr>
                  <th class="main-table-heading">Instrument / Facility
                  <th class="main-table-heading">Amount (Rs. Crore)
                  <th class="main-table-heading">Ratings
                  <th class="main-table-heading">Rating Action
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="entity-name">Long Term Bank Facilities</td>
                  <td> XX </td>
                  <td> XXX </td>
                  <td> Assigned </td>
                </tr>
                <tr>
                  <td class="entity-name">Short Term Bank Facilities </td>
                  <td> XX </td>
                  <td> XX </td>
                  <td> Assigned </td>
                </tr>
                <tr>
                  <td class="entity-name">Long Term /Short Term Bank Facilities </td>
                  <td> XX </td>
                  <td> XX </td>
                  <td> Assigned </td>
                </tr>
                <tr class="total">
                  <td> Total </td>
                  <td> XX </td>
                  <td> </td>
                  <td> </td>
                </tr>
              </tbody>
            </table>
        </div> 
        <section> 
          <p> It may please be noted that this is a provisional communication made to you for your conveying the acceptance of the aforesaid rating and this communication cannot be used by you for any purpose. The final rating communication shall be sent to you soon after the acceptance of the aforesaid ratingis conveyed to us.</p>
          <p> Our rating symbols for long term and short term rating along with explanatory notes thereon are annexed in XXXXXX. </p>
          <p> Please send us your aforesaid acceptance in writing as per the attached Annexure II and use thereof within a maximum period of five days from the date of this communication, as per the requirement of SEBI. Please note that the rating shall not be used for any purpose whatsoever if the rating is not accepted and communicated to us as per the prescribed format as aforesaid. However, Infomerics is entitled to disseminate the rating in its website within a period of one month from the date of this communication even if the rating is not accepted.</p>
          <br>
          <br>
          <p> Thanking you,</p>
          <p> With regards,</p>
          <br>
          <br>
          <b> (Name)</b>
          <p> Designation</p>
          <p> Email:</p>
          <br>
        </section>
        
        <div style="border: 1px solid black; font-size: 0.8rem; margin: 0 1rem">
          <strong>Disclaimer:</strong> 
          <span>Infomerics ratings are based on information provided by the issuer on an ‘as is where is’ basis. Infomerics credit ratings are an opinion on the credit risk of the issue / issuer and not a recommendation to buy, hold or sell securities.  Infomerics reserves the right to change, suspend or withdraw the credit ratings at any point in time. Infomerics ratings are opinions on financial statements based on information provided by the management and information obtained from sources believed by it to be accurate and reliable. The credit quality ratings are not recommendations to sanction, renew, disburse or recall the concerned bank facilities or to buy, sell or hold any security. We, however, do not guarantee the accuracy, adequacy or completeness of any information which we accepted and presumed to be free from misstatement, whether due to error or fraud. We are not responsible for any errors or omissions or for the results obtained from the use of such information. Most entities whose bank facilities/instruments are rated by us have paid a credit rating fee, based on the amount and type of bank facilities/instruments. In case of partnership/proprietary concerns/Association of Persons (AOPs), the rating assigned by Infomerics is based on the capital deployed by the partners/proprietor/ AOPs and the financial strength of the firm at present. The rating may undergo change in case of withdrawal of capital or the unsecured loans brought in by the partners/proprietor/ AOPs in addition to the financial performance and other relevant factors.
          <span>
        </div>
        <br>
        <br>
        <h3 class="text-center"> ANNEXURE I </h3>
        <br>
        <h4 class="text-center">INFOMERICS Rating Scale for Long Term Instruments & Borrowing Programmes </h4>
        <div class='table-div'>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Rating Scale</th>
                <th style="text-align: center;">Definition</th>
              </tr>
            </thead>
            <tbody> 
              <tr>
                <td>IVR AAA</td>
                <td>Instruments with this rating are considered to offer the highest degree of safety regarding timely servicing of financial obligations. Such issuers carry lowest credit risk.</td>
              </tr>
              <tr> 
                <td>IVR AA</td>
                <td>Instruments with this rating are considered to offer high degree of safety regarding timely servicing of financial obligations. Such issuers carry very low credit risk.</td>
              </tr>
              <tr> 
                <td>IVR A</td>
                <td>Instruments with this rating are considered to offer adequate degree of safety regarding timely servicing of financial obligations. Such issuers carry low credit risk.</td>
              </tr>
              <tr> 
                <td>IVR BBB</td>
                <td>Instruments with this rating are considered to offer moderate degree of safety regarding timely servicing of financial obligations. Such issuers carry moderate credit risk.</td>
              </tr>
              <tr> 
                <td>IVR BB</td>
                <td>Instruments with this rating are considered to offer moderate risk of default regarding timely servicing of financial obligations.</td>
              </tr>
              <tr> 
                <td>IVR B</td>
                <td>Instruments with this rating are considered to offer high risk of default regarding timely servicing of financial obligations.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <section> 
          <i>INFOMERICS may apply '+' (plus) or '-' (minus) signs for ratings assigned ‘IVR AA' to ‘IVR C' to indicate their relative standing within the category. </i>
          <br>
          <br>
          <i>INFOMERICS may assign rating outlooks for ratings from IVR ‘AAA' to IVR ‘B'.</i>
          <br>
          <br>
          <strong>INFOMERICS Rating Scale for Short Term Instruments & Borrowing Programmes</strong>
          <br>
          <br>
        </section>
        <div class='table-div'>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Rating Scale</th>
                <th style="text-align: center;">Definition</th>
              </tr>
            </thead>
            <tbody> 
              <tr>
                <td>IVR A1</td>
                <td>Instruments with this rating are considered to have very strong degree of safety regarding timely payment of financial obligations. Such instruments carry lowest credit risk.</td>
              </tr>
              <tr>
                <td>IVR A2</td>
                <td>Instruments with this rating are considered to have strong degree of safety regarding timely payment of financial obligations. Such instruments carry low credit risk.</td>
              </tr>
              <tr>
                <td>IVR A3</td>
                <td>Instruments with this rating are considered to have moderate degree of safety regarding timely payment of financial obligations. Such instruments carry higher credit risk as compared to instruments rated in the two higher categories.</td>
              </tr>
              <tr>
                <td>IVR A4</td>
                <td>Instruments with this rating are considered to have minimal degree of safety regarding timely payment of financial obligations. Such instruments carry very high credit risk and are susceptible to default.</td>
              </tr>
              <tr>
                <td>IVR D</td>
                <td>Instruments with this rating are in default or expected to be in default on maturity in servicing of debt obligations.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <section> 
          <i>INFOMERICS may apply '+' (plus) signs for ratings assigned from ‘IVR A1' to ‘IVR A4' to indicate their relative standing within the category.</i>
          <br>
          <br>
          <h3 class="text-center">ANNEXURE II</h3>
          <br>
        </section>
        <p style="text-align: center;">(To be typed in the letterhead of the rated entity)</p>
        <section> 
          <p>Date:</p>
          <br> 
          <p>Infomerics Valuation and Rating Private Limited </p>
          <br>
          <p>104/108, Golf Apartments, Sujan Singh Park </p>
          <br>
          <p>New Delhi 110013</p>
          <br>
          <p>Dear Sir,</p>
          <br>
          <h3 class="text-center">Acceptance of Rating, </p>
          <br>
          <p>We hereby convey our acceptance to the following rating from Infomerics Valuation and Rating Private Limited as tabulated below:</p>
          <br>
        </section>
        <div class='table-div'>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Instrument / Facility</th>
                <th style="text-align: center;"> Amount (Rs. Crore)</th>
                <th style="text-align: center;">Ratings</th>
                <th style="text-align: center;">Rating Action</th>
              </tr>
            </thead>
            <tbody> 
              <tr>
                <td>Long Term Bank Facilities </td>
                <td>XX</td>
                <td>XX</td>
                <td>Assigned</td>
              </tr>
              <tr>
                <td>Short Term Bank Facilities </td> 
                <td>XX </td>
                <td>XX </td>
                <td>Assigned </td>
              </tr>
              <tr>
                <td>Long Term /Short Term Bank Facilities</td>
                <td>XX </td>
                <td>XX </td>
                <td>Assigned </td>
              </tr>
              <tr>
                <td style="font-weight: 600">Total </td>
                <td style="font-weight: 600">XX</td>
                <td>
                <td>
              </tr>
            </tbody>
          </table>
        </div>
        <section> 
          <p>For ${data.prov_comm_blr_ratings[0].company_name}</p>
          <br>
          <p>Authorised Signatory</p>
          <br>
          <br>
          <p>${data.prov_comm_blr_ratings[0].company_contact}</p>
          <br>
          <p>${data.prov_comm_blr_ratings[0].designation}</p>
        </section>   
      </main>`

    const doc_url_promise = new Promise((resolve, reject) => {
        async function createDoc(html) {
          const fileBuffer = await HTMLtoDOCX(html, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
          });
        
          writeFileSync(path, fileBuffer, (error) => {
            if (error) {
              console.log('Docx file creation failed');
              return;
            }
          });
      
          const document_link = await UPLOAD_TO_AZURE_STORAGE(fileBuffer, {
            path: path
          })

          if (!document_link) {
            reject({
              success: false,
              error: "Document Link Not Available"
            })
          }

          await RatingCommitteeMeetingDocument.create({
            uuid: uuidv4(),
            path: document_link,
            is_active: true,
            rating_committee_meeting_id: data.prov_comm_blr_ratings[0].rating_committee_meeting_id,
            doc_type: "docx",
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id
          })

          resolve(document_link)
        }
        createDoc(html)
      })

      document_url = await doc_url_promise

      var response = {};
      response['uuid'] = uuidv4();
      response['document_url'] = document_url
      reply.send(response);
    } catch (error) {
      console.log("Error", error);
      return reply.send({
        "error": String(error),
      })
    }
  });

  fastify.post('/prov_comm_blr/generate/pdf', async (request, reply) => {
    try {

      const header = () => {
        return `
        <div style="text-align: center; width: 100%;">
          <p style="text-align: center">
            <strong style="font-size: 12pt; font-family: Cambria, serif;">I</strong>
            <strong style="font-size: 10pt; font-family: Cambria, serif; margin-right: 4.5rem">NFOMERICS</strong>
            <strong style="font-size: 12pt; font-family: Cambria, serif;">V</strong>
            <strong style="font-size: 10pt; font-family: Cambria, serif; margin-right: 4.5rem">ALUATION AND</strong>
            <strong style="font-size: 12pt; font-family: Cambria, serif;">R</strong>
            <strong style="font-size: 10pt; font-family: Cambria, serif; margin-right: 4.5rem">ATING</strong>
            <strong style="font-size: 12pt; font-family: Cambria, serif;">P</strong>
            <strong style="font-size: 10pt; font-family: Cambria, serif; margin-right: 4.5rem">RIVATE</strong>
            <strong style="font-size: 12pt; font-family: Cambria, serif;">L</strong>
            <strong style="font-size: 10pt; font-family: Cambria, serif;">IMITED</strong>
          </p>
      <br>
      <p style="text-align: center">
          <span style="font-size: 8pt; font-family: Cambria, serif;">Head Office - Flat No. 104/106/108, Golf Apartments, Sujan Singh Park,</span>
      </p>
      <p style="text-align: center">
          <span style="font-size: 8pt; font-family: Cambria, serif;">&nbsp;New Delhi-110003,</span>
      </p>
      <p style="text-align: center">
          <span style="font-size: 8pt; font-family: Cambria, serif;">Email: </span>
          <a href="mailto:vma@infomerics.com" target="_blank" style="font-size: 8pt; font-family: Cambria, serif; color: rgb(5, 99, 193);">vma@infomerics.com</a>
          <span style="font-size: 8pt; font-family: Cambria, serif;">, Website: </span>
          <span style="font-size: 8pt; font-family: Cambria, serif; color: rgb(5, 99, 193);">www.infomerics.com</span>
      </p>
      <p style="text-align: center">
          <span style="font-size: 8pt; font-family: Cambria, serif;">Phone: +91-11 24601142, 24611910, Fax: +91 11 24627549</span>
      </p>
      <p style="text-align: center">
          <strong style="font-size: 8pt; font-family: Cambria, serif;">(CIN: U32202DL1986PTC024575)</strong>
      </p>
      <p>
          <br>
      </p>
      <p>
          <br>
      </p>
      </div>
        `;
      };

      await CHECK_PERMISSIONS(request, 'Rating.Letter')

      const { params } = request.body

      const GENERATE_UUID = uuidv4();

      const path = `generated/prov_comm_blr_pdf_${GENERATE_UUID}.pdf`

      const data = await GET_PROV_COMM_BLR_DATA({
        rating_committee_meeting_params: {
        uuid: params["rating_committee_meeting_uuid"],
        is_active: true
        }, company_params: {
          uuid: params["company_uuid"],
          is_active: true
        }})

      const browser = await puppeteer.launch({
        headless: false,
        args: ['--headless']
      });
      const page = await browser.newPage();
      const html = await fastify.view(`templates/pdf/${params['filename']}.pug`, { data: data, require: require });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.emulateMediaType('screen');
      await page.pdf({
        displayHeaderFooter: true,
        headerTemplate: header(),
        path: path,
        margin: { top: '160px', right: '10px', bottom: '100px', left: '10px' },
        printBackground: true,
        format: 'A4',
      });
      await browser.close();

      const pdf = readFileSync(path)

      const document_url = await UPLOAD_TO_AZURE_STORAGE(pdf, {
        path: path
      })

      await RatingCommitteeMeetingDocument.create({
        uuid: uuidv4(),
        path: document_url,
        is_active: true,
        rating_committee_meeting_id: data.prov_comm_blr_ratings[0].rating_committee_meeting_id ,
        doc_type: "pdf",
        created_at: new Date(),
        updated_at: new Date(),
        created_by: request.user.id
      })

      var response = {};
      response['uuid'] = uuidv4();
      response['document_url'] = document_url,
      response['data'] = data
      reply.send(response);
    } catch (error) {
      console.log("Error", error);
      return reply.send({
        "error": String(error),
      })
    }
  });
}

module.exports = {
    provisional_comm_blr_docs_routes
};