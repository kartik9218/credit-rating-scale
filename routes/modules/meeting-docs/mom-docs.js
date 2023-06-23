const { writeFileSync, readFileSync } = require("fs");
const moment = require("moment");
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_TO_AZURE_STORAGE } = require("../../../helpers");
const { CHECK_PERMISSIONS } = require("../../../helpers");
const { RatingCommitteeMeetingDocument } = require("../../../models/modules/rating-committee");
const { GET_MOM_SHEET_DATA } = require("../../../repositories/MOMSheetData");
const HTMLtoDOCX = require('html-to-docx');

async function mom_docs_routes(fastify) {
  fastify.post('/mom/generate/docx', async (request, reply) => {
    try {

      await CHECK_PERMISSIONS(request, 'Rating.Letter')

      const GENERATE_UUID = uuidv4();

      const path = `generated/mom_doc_${GENERATE_UUID}.docx`

      const { params } = request.body;

      const data = await GET_MOM_SHEET_DATA({
        uuid: params["rating_committee_meeting_uuid"],
        is_active: true
      })

      const suffixes = (num) => {
        const strNum = num.toString()
        const newNum = strNum[strNum.split("").length-1]
          if (newNum == "1") {
            return "st"
          } else if (newNum == '2') {
            return "nd"
          } else if (newNum == "3") {
            return "rd"
          } else {
            return "th"
          }
      }

      var header = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>MOM-DOC</title></head><body>`

      var html = header

      html += `
        <main style="line-height: 1.5rem;">
          <div style="text-align: center; width: 100%; line-height: 20px">
            <p style="text-align: center">
              <strong style="font-size: 12pt; font-family: 'Cambria', serif;">I</strong>
              <strong style="font-size: 12pt; font-family: 'Cambria', serif;">NFOMERICS</strong>
              <strong style="font-size: 12pt; font-family: 'Cambria', serif;"> V</strong>
              <strong style="font-size: 10pt; font-family: 'Cambria', serif; margin-right: 4.5rem">ALUATION AND</strong>
              <strong style="font-size: 12pt; font-family: 'Cambria', serif;"> R</strong>
              <strong style="font-size: 10pt; font-family: 'Cambria', serif; margin-right: 4.5rem">ATING</strong>
              <strong style="font-size: 12pt; font-family: 'Cambria', serif;"> P</strong>
              <strong style="font-size: 10pt; font-family: 'Cambria', serif; margin-right: 4.5rem">RIVATE</strong>
              <strong style="font-size: 12pt; font-family: 'Cambria', serif;"> L</strong>
              <strong style="font-size: 10pt; font-family: 'Cambria', serif;">IMITED</strong>
            </p>
            <p style="text-align: center">
                <span style="font-size: 8pt; font-family: 'Cambria', serif;">Head Office - Flat No. 104/106/108, Golf Apartments, Sujan Singh Park,</span>
            </p>
            <p style="text-align: center">
                <span style="font-size: 8pt; font-family: 'Cambria', serif;">&nbsp;New Delhi-110003,</span>
            </p>
            <p style="text-align: center">
                <span style="font-size: 8pt; font-family: 'Cambria', serif;">Email: </span>
                <a href="mailto:vma@infomerics.com" target="_blank" style="font-size: 8pt; font-family: 'Cambria', serif; color: rgb(5, 99, 193);">vma@infomerics.com</a>
                <span style="font-size: 8pt; font-family: 'Cambria', serif;">, Website: </span>
                <span style="font-size: 8pt; font-family: 'Cambria', serif; color: rgb(5, 99, 193);">www.infomerics.com</span>
            </p>
            <p style="text-align: center">
                <span style="font-size: 8pt; font-family: 'Cambria', serif;">Phone: +91-11 24601142, 24611910, Fax: +91 11 24627549</span>
            </p>
            <p style="text-align: center">
                <strong style="font-size: 8; font-family: 'Cambria', serif;">(CIN: U32202DL1986PTC024575)</strong>
            </p>
            <p>
                <br>
            </p>
            </div>
            <p style="border-bottom: 2px dashed #000; padding-bottom: 16px; margin-bottom: 8px; width: 75%;">
              <strong>Minutes of </strong>
              <span>${data.docs_data[0].agenda_table_data_1[0].instruments[0].rating_committee_meeting_id}${suffixes(data.docs_data[0].agenda_table_data_1[0].instruments[0].rating_committee_meeting_id)}</span>/ ${moment(data.docs_data[0].agenda_table_data_1[0].instruments[0].meeting_at).subtract(1, 'year').format('YYYY')} - ${moment(data.docs_data[0].agenda_table_data_1[0].instruments[0].meeting_at).format('YYYY')} meeting of the Rating Committee duly convened on ${moment(data.docs_data[0].agenda_table_data_1[0].instruments[0].meeting_at).format('dddd, Do MMMM YYYY')} at ${moment(data.docs_data[0].agenda_table_data_1[0].instruments[0].meeting_at).format('hh:mm a')}  through Video Conference.</span>
            </p>  
            <p style="border-top: 2px dashed #000; padding-top: 1rem; margin-top: 0.2rem; width: 75%;">
              <u>Rating Committee Members Present:</u>
            </p>
            <ol>  
                <li>${data.docs_data[0].agenda_table_data_1[0].rating_committee_members_present[0].name}</li>
            </ol>
            <br>
            <p>   
              <u>Persons attended the RCM:</u> 
            </p>
            <ol>
                <li>${data.docs_data[0].agenda_table_data_1[0].persons_attended_rcm[0].name}, ${data.docs_data[0].agenda_table_data_1[0].persons_attended_rcm[0].position}</li>
            </ol>
            <br>
            <p>
              <i> 
                <u>Item No. 1</u>
              </i>
            </p>
            <p>
              <i> 
                <u>Chairman</u>
              </i>
            </p>
            <p>  
              <strong>Mr. ${data.docs_data[0].agenda_table_data_1[0].chairman}</strong> was unanimously appointed as the Chairman of the meeting. The Chairman occupied the chair and declared the commencement of meeting after confirming the presence of the required quorum for the meeting.
            </p>
            <p>
              <i> 
                <u>Item No. 2</u>
              </i>
            </p>
              <u>Leave of Absence</u>
            <p>All Committee members were present at the meeting.</p>
            <p>
              <i> 
                <u>Item No. 3: Agenda No. A </u>
              </i>
            </p>
            <p>   
              <u>To confirm the minutes of 53rd RCM/ 2022-2023 held on 07th November, 2022.</u>
            </p>

            <p>The Minutes of the <strong><span class="last_meet">RCM/ ${moment(data.docs_data[0].agenda_table_data_1[0].instruments.meeting_at).subtract(1, 'year').format('YYYY')} - ${moment(data.docs_data[0].agenda_table_data_1[0].instruments.meeting_at).format('YYYY')}  held on ${moment(data.docs_data[0].agenda_table_data_1[0].instruments.meeting_at).format('Do MMMM YYYY')}</span></strong>were circulated to all the members vied email dated<strong> 11th November 2022</strong>for confirmation and the same was confirmed by all the members through email.
            </p>`;
            
            data.docs_data[0].agenda_table_data_1.forEach((item, index) => {
              html += `
              <p>
                <i>
                  <u>Item No. ${4 + index}: Agenda No. B${index + 1}</u>
                </i>
              </p>
              <p>To consider the Rating Proposal of <strong>${item.instruments[0].entity_name}</strong>
              </p>
                
                <table style="width: 100%">  
                <tbody>
                  <tr>
                    <td>Name of the Rated Entity</td>  
                      <td> ${item.instruments[0].entity_name}</td>
                  </tr>
                  <tr>
                  <td>Nature of Instrument</td>
                    <td> ${item.instruments[0].instrument}</td>
                  </tr>
                  <tr>
                  <td>Size (Rs. Crore)</td> 
                    <td>${item.size}</td>
                  </tr>
                  <tr>
                  <td>Fresh Rating/ Surveillance</td>
                    <td> ${item.rating_process}</td>
                  </tr>
                  <tr>
                  <td>Existing Rating</td>
                    <td> ${item.existing_rating}</td>
                  </tr>
                  <tr>
                  <td>Proposed Rating</td>
                    <td> ${item.proposed_rating}</td>
                  </tr>
                  <tr>
                  <td>Current Rating Assigned</td>
                    <td> ${item.current_rating_assigned}</td>
                  </tr>
                  <tr>
                  <td>Name of the Analyst</td>
                    <td> ${item.rating_analyst}</td>
                  </tr>
                </tbody>
                </table>
      
              <strong>The case was presented by the Rating Analyst and the key salient features mentioned are as below:</strong>     
              <br/>`;
            })

            data.docs_data.forEach(item => {
              if (Array.isArray(item)) {
                item.forEach(minutes => {
                  html += `<p>${minutes.rating_analyst_points}</p>`
                })
              }
            })

              html += `<br>
              <strong>Post the presentation, the committee discussed the following issues:</strong>
              <br/>
`
            data.docs_data.forEach(item => {
              if (Array.isArray(item)) {
                item.forEach(minutes => {
                  html += `<p>${minutes.post_presentation_committee_discussed_issue}</p>`
                })
              }
            })

              html += `
              <br>
              <strong>Rating Analyst clarified the following points to the committee:</strong>
              <br>
              <p> The company has formed Foreign Exchange Risk Management Policy. As per policy recommended hedge ratio is as follows:</p>
              <br>
              <strong>  
                <u>Exports
              </strong>
              <br>
              <p>The Unhedged foreign currency exposure as on September 30, 2022 is Rs.11.43 crore (Receivable).
              strong After the brief discussion on the agenda papers, the Rating Committee assigned the rating as proposed.
              </p>
              <p>
                <u>Vote of Thanks
              </p>
              <p>The meeting concluded with a vote of thanks to the chair at 5:30 pm.</p>
              <br>
              <strong>Dissent (if any) by any RCM member - Nil</strong>
              <br>
              <br>
              <br>
              <br>
            <div style="display: flex; justify-content: space-between;">
              <div> 
                <strong>Date: ${moment(data.docs_data[0].agenda_table_data_1[0].instruments[0].meeting_at).format("DD/MM/YYYY")}</strong>
                <br>
                <br>
                <strong>Place: New Delhi</strong>
              </div>
            </div>
              <div> 
                <strong>Name</strong>
                <br>
                <br>
                <strong>Position</strong>
              </div>
            </main>
            </body>
          </html>`
     
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
            rating_committee_meeting_id: data.docs_data[0].agenda_table_data_1[0].instruments[0].rating_committee_meeting_id,
            doc_type: "docx",
            created_at: new Date(),
            updated_at: new Date(),
            created_by: request.user.id
          })

          resolve(document_link)
        }
        createDoc(html)
      })

      const document_url = await doc_url_promise

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

  fastify.post('/mom/generate/pdf', async (request, reply) => {
    try {

      await CHECK_PERMISSIONS(request, 'Rating.Letter')

      const { params } = request.body

      const GENERATE_UUID = uuidv4();

      const path = `generated/mom_pdf_${GENERATE_UUID}.pdf`

      const data = await GET_MOM_SHEET_DATA({
        uuid: params["rating_committee_meeting_uuid"],
        is_active: true
      })

      let minutes_points = ''

      data.docs_data.forEach((item) => {
        if (Array.isArray(item)) {
          minutes_points = item
        }
      })

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

      const browser = await puppeteer.launch({
        headless: false,
        args: ['--headless']
      });
      const page = await browser.newPage();
      const agenda_data = data?.docs_data[0]?.agenda_table_data_1[0]
      const html = await fastify.view(`templates/pdf/${params['filename']}.pug`, { data: data, agenda_data: agenda_data, minutes_points: minutes_points, require: require });
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
        rating_committee_meeting_id: data.docs_data[0].agenda_table_data_1[0].instruments[0].rating_committee_meeting_id,
        doc_type: "pdf",
        created_at: new Date(),
        updated_at: new Date(),
        created_by: request.user.id
      })

      var response = {};
      response['uuid'] = uuidv4();
      response['document_url'] = document_url,
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
    mom_docs_routes
};