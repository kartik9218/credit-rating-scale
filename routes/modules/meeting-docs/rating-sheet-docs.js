const { writeFileSync, readFileSync } = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, UnderlineType, HeadingLevel, BorderStyle, VerticalAlign } = require("docx");
const docxConverter = require('docx-pdf');
const moment = require("moment");
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_TO_AZURE_STORAGE } = require("../../../helpers");
const { GET_RATING_SHEET_DATA } = require("../../../repositories/RatingSheetData");
const { CHECK_PERMISSIONS } = require("../../../helpers");
const { RatingCommitteeMeetingDocument } = require("../../../models/modules/rating-committee");

async function rating_sheet_docs_routes(fastify) {
  fastify.post('/rating_sheet/generate/docx', async (request, reply) => {
    try {

      await CHECK_PERMISSIONS(request, 'Rating.Letter')

      let document_url = ''

      const GENERATE_UUID = uuidv4();

      const path = `generated/rating_sheet_doc_${GENERATE_UUID}.docx`

      const { params } = request.body;

      const data = await GET_RATING_SHEET_DATA({
        uuid: params["rating_committee_meeting_uuid"],
        is_active: true
      })

      console.log("data--->", data);

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

      const heading = new Paragraph({
        text: 'INFOMERICS VALUATION AND RATING PRIVATE LIMITED',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        allCaps: true,
        bold: true
      })

      const contact_info_1 = new Paragraph({
        text: 'Head Office-Flat No. 104/106/108, Golf Apartments, Sujan Singh Park, New Delhi-110003',
        alignment: AlignmentType.CENTER,
      })

      const contact_info_2 = new Paragraph({
        text: 'Email: vma@infomerics.com, Website: https://www.infomerics.com',
        alignment: AlignmentType.CENTER,
      })

      const contact_info_3 = new Paragraph({
        alignment: AlignmentType.CENTER,
      })

      const cin = new Paragraph({
        text: `(CIN: ${data.docs_data[0].company_cin})`,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER
      })

      const agenda_line = new Paragraph({
        text: "Rating Sheet",
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER
      })

      const meeting_detail_head = new Paragraph({
        text: `Rating Sheet for ${data.docs_data[0].instruments[0].rating_committee_meeting_id}${suffixes(data.docs_data[0].instruments[0].rating_committee_meeting_id)} Rating Committee Meeting (RCM) for the Financial Year 2022-2023 of Infomerics Valuation and Rating Private Limited to be held on ${moment(data.docs_data[0].instruments[0].meeting_at).format("dddd, MMMM Do YYYY, h:mm a")} through video conference.`,
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.CENTER
      })

      const table_header = new Table({
        alignment: AlignmentType.CENTER,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: {
                      style: BorderStyle.THICK,
                      size: 10,
                      color: "000000",
                  },
                  bottom: {
                      style: BorderStyle.THICK,
                      size: 10,
                      color: "000000",
                  },
                  left: {
                    style: BorderStyle.THICK,
                    size: 10,
                    color: "000000",
                  },
                  right: {
                    style: BorderStyle.THICK,
                    size: 10,
                    color: "000000",
                  },
                },
                columnSpan: 1000,
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph("                                                                                        Rating Sheet")],
              }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph("Sr. No")],
              }),
              new TableCell({
                children: [new Paragraph("Name of the Entity")],
              }),
              new TableCell({
                children: [new Paragraph("Instrument/Facility")]
              }),
              new TableCell({
                children: [new Paragraph("Size (Rs Crore)")]
              }),
              new TableCell({
                children: [new Paragraph("Nature of Assignment")]
              }),
              new TableCell({
                children: [new Paragraph("Existing Rating")]
              }),
              new TableCell({
                children: [new Paragraph("Proposed Rating")]
              }),
              new TableCell({
                children: [new Paragraph("Committee Assigned Rating")]
              })
            ]
          }),
        ]
      });

      const date = new Paragraph({
        text: ` Date: ${moment(data.docs_data[0].instruments[0].meeting_at).format('Do MMMM YYYY')}`,
        heading: HeadingLevel.HEADING_4
      })

      let table_rows = [];
      let serial_number = 1;
      data.docs_data.forEach((data, index) => {
        data.instruments.forEach(instrument => {
          table_rows.push(new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: String(serial_number) })],
              }),
              new TableCell({
                children: [new Paragraph({ text: data['entity_name'] })],
              }),
              new TableCell({
                children: [new Paragraph({ text: instrument['instrument'] })],
              }),
              new TableCell({
                children: [new Paragraph(String(instrument['size_in_crore']))],
              }),
              new TableCell({
                children: [new Paragraph({ text: instrument['nature_of_assignment'] })],
              }),
              new TableCell({
                children: [new Paragraph({ text: instrument['existing_rating'] })],
              }),
              new TableCell({
                children: [new Paragraph({ text: instrument['proposed_rating'] })],
              }),
              new TableCell({
                children: [new Paragraph({ text: instrument['committee_assigned_rating'] })],
              }),
            ]
          }))
        })
        serial_number++;
      });

      const table_rows_container = new Table({
        rows: table_rows
      });

      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: {
                size: 24,
                bold: true,
                font: 'Cambria'
              },
              paragraph: {
                spacing: {
                  after: 120,
                },
              },
            },
            {
              id: "Heading2",
              name: "Heading 2",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: {
                size: 20,
                bold: true,
                underline: {
                  type: UnderlineType.SINGLE,
                  color: "000000",
                },
                font: 'Calibri'
              },
              paragraph: {
                spacing: {
                  before: 100,
                  after: 100,
                },
              },
            },
            {
              id: "Heading3",
              name: "Heading 3",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: {
                size: 20,
                bold: true,
              },
              paragraph: {
                spacing: {
                  before: 100,
                  after: 100,
                },
              },
            },
            {
              id: "Heading4",
              name: "Heading 4",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: {
                size: 20,
                bold: true,
                font: 'Calibri'
              },
              paragraph: {
                spacing: {
                  before: 100,
                  after: 100,
                },
              },
            },
            {
              id: "aside",
              name: "Aside",
              basedOn: "Normal",
              next: "Normal",
              run: {
                color: "999999",
                italics: true,
              },
              paragraph: {
                indent: {
                  left: 720,
                },
                spacing: {
                  line: 276,
                },
              },
            },
          ],
        },
        sections: [
          {
            properties: {},
            children: [
              heading,
              contact_info_1,
              contact_info_2,
              contact_info_3,
              cin,
              agenda_line,
              meeting_detail_head,
              table_header,
              table_rows_container,
              date
            ],
          },
        ],
      });

      const doc_url_promise = new Promise((resolve, reject) => {

        Packer.toBuffer(doc).then(async (buffer) => {
          let doc_fs = path;
          let pdf_fs = "generated/Sample_Document.pdf";
          writeFileSync(doc_fs, buffer);
  
          docxConverter(doc_fs, pdf_fs, function (err, result) {
            if (err) { console.log(err); }
          });
  
          const docx = readFileSync(path)
  
          document_url = await UPLOAD_TO_AZURE_STORAGE(docx, {
            path: doc_fs
          })
  
        await RatingCommitteeMeetingDocument.create({
          uuid: uuidv4(),
          path: document_url,
          is_active: true,
          rating_committee_meeting_id: data.docs_data[0].instruments[0].rating_committee_meeting_id,
          doc_type: "docx",
          created_at: new Date(),
          updated_at: new Date(),
          created_by: request.user.id
        })

        resolve(document_url)
  
        });

      })

      const document_link = await doc_url_promise

      var response = {};
      response['uuid'] = uuidv4();
      response['document_url'] = document_link;
      reply.send(response);
    } catch (error) {
      console.log("Error", error);
      return reply.send({
        "error": String(error),
      })
    }
  });

  fastify.post('/rating_sheet/generate/pdf', async (request, reply) => {
    try {

      await CHECK_PERMISSIONS(request, 'Rating.Letter')

      const { params } = request.body

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

      const GENERATE_UUID = uuidv4();

      const path = `generated/rating_sheet_pdf_${GENERATE_UUID}.pdf`

      const data = await GET_RATING_SHEET_DATA({
        uuid: params["rating_committee_meeting_uuid"],
        is_active: true
      })

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
        margin: { top: '160px', bottom: '100px' },
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
        rating_committee_meeting_id: data.docs_data[0].instruments[0].rating_committee_meeting_id,
        doc_type: "pdf",
        created_at: new Date(),
        updated_at: new Date(),
        created_by: request.user.id
      })

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
}

module.exports = {
  rating_sheet_docs_routes
};