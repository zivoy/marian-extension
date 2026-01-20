import { addContributor, addMapping, cleanText, collectObject, getCoverData, normalizeReadingFormat } from "../shared/utils.js";
import { Extractor } from "./AbstractExtractor.js"

const worldCatRe = /https:\/\/search\.worldcat\.org\/(?:\w+\/)?title\/(?<oclc>\d+)/;

class worldCatScraper extends Extractor {
  get _name() { return "WorldCat Extractor"; }

  needsReload = false;
  _sitePatterns = [
    worldCatRe,
  ];

  async getDetails() {
    const idMatch = document.location.href.match(worldCatRe);
    if (!idMatch) throw new Error("Invalid url");
    const oclc = idMatch.groups.oclc;

    const nextData = getNextData();

    // updated data
    const nextDataUrl = getDataApiUrl(nextData.buildId, oclc);
    const response = await fetch(nextDataUrl);
    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }
    const json = await response.json();

    const props = json.pageProps;
    if (!props) throw new Error("Missing page properties");
    const record = props.record;
    if (!record) throw new Error("Missing page record");

    return collectObject([
      getCover(record),
      getDetails(record),
      { "Mappings": addMapping({}, "OCLC/WorldCat", oclc) },
    ]);
  }
}

function getCover(pageRecord) {
  // const base = `https://coverart.oclc.org/ImageWebSvc/oclc/+-+${pageRecord.oclcNumber}_140.jpg`
  // TODO: find better image

  const webPage = document.querySelector(`.tss-jeybmc-root-withPadding .MuiBox-root.mui-0 img`)?.src;

  return getCoverData([
    webPage
  ]);
}

function getDetails(pageRecord) {
  if (!pageRecord) return {};
  const details = {};

  let date = pageRecord.machineReadableDate ?? pageRecord.publicationDate;
  if (date && date.match(/^\d+$/)) date = new Date(date, 0);
  if (date) details["Publication date"] = date;

  if (pageRecord.title) details["Title"] = pageRecord.title;
  if (pageRecord.edition) details["Edition Information"] = pageRecord.edition;
  if (pageRecord.publisher) details["Publisher"] = pageRecord.publisher;
  if (pageRecord.specificFormat) details["Edition Format"] = pageRecord.specificFormat;
  if (pageRecord.generalFormat) details["Reading Format"] = normalizeReadingFormat(pageRecord.generalFormat);
  if (pageRecord.summary) details["Description"] = pageRecord.summary;
  if (pageRecord.physicalDescription) {
    details["Physical Description"] = pageRecord.physicalDescription;
    // 420 pages : chiefly illustrations (some color) ; 22 cm.
    const pageEditionInformation = pageRecord.physicalDescription.split(";")[0];
    if (pageEditionInformation) {
      const s = pageEditionInformation.split(":");
      if (s.length > 1) {
        let ed = cleanText(s[1])
        if (details["Edition Information"]) ed = `${details["Edition Information"]}; ${ed}`;
        details["Edition Information"] = ed;
      }

      const pageMatch = pageEditionInformation.match(/(\d+) .+/);
      if (pageMatch) {
        details["Pages"] = pageMatch[1];
      }
    }
  }
  if (pageRecord.catalogingLanguage) {
    let language = pageRecord.catalogingLanguage;
    switch (language) {
      case "eng": { language = "English"; break; }
      // TODO:
    }
    details["Language"] = language;
  }
  if (pageRecord.languageNotes) details["Language notes"] = pageRecord.languageNotes.join(" ");
  if (pageRecord.contributors) {
    const contributors = [];
    pageRecord.contributors.forEach((contributor) => {
      const contributorDetails = getContributorDetails(contributor);
      addContributor(contributors, contributorDetails.name, contributorDetails.roles);
    });
    details["Contributors"] = contributors;
  }
  if (pageRecord.isbn13) {
    details["ISBN-13"] = pageRecord.isbn13;
    // find related isbn10
    if (pageRecord.isbns) {
      const matcher = pageRecord.isbn13.substring(3, 12);
      const isbn10 = pageRecord.isbns.filter(x => x.startsWith(matcher))[0]
      if (isbn10) details["ISBN-10"] = isbn10;
    }
  }

  return details;
}

function getNextData() {
  const text = document.querySelector(`#__NEXT_DATA__`)?.innerText;
  if (!text) throw new Error("Next data is not present");
  return JSON.parse(text);
}

function getDataApiUrl(buildId, oclc) {
  return `https://search.worldcat.org/_next/data/${buildId}/en/title/${oclc}.json?slug=${oclc}`
}

function getContributorDetails(contributor) {
  const firstName = contributor.firstName?.text || '';
  const secondName = contributor.secondName?.text || '';

  let name;
  if (contributor.nonPersonName) {
    name = contributor.nonPersonName.text;
  } else if (firstName && secondName) {
    // Check for RTL text direction
    const isRTL = contributor.firstName?.textDirection === "RTL";
    name = isRTL
      ? `${secondName} ${firstName}`
      : `${firstName} ${secondName}`;
  } else {
    name = firstName || secondName;
  }

  // Map relator codes to role names
  const roles = contributor.relatorCodes
    ?.map(code => relatorMap[code])
    .filter(Boolean) || [];

  if (roles.length === 0) roles.push("Author");

  return {
    name: name.trim(),
    roles: roles
  };
}

const relatorMap = {
  abr: "Abridger", act: "Actor", adp: "Adapter", rcp: "Addressee", anl: "Analyst", anm: "Animator", ann: "Annotator", apl: "Appellant", ape: "Appellee", app: "Applicant", arc: "Architect", arr: "Arranger", acp: "Art copyist", adi: "Art director", art: "Artist", ard: "Artistic director", asg: "Assignee", asn: "Associated name", att: "Attributed name", auc: "Auctioneer", aut: "Author", aqt: "Author in quotations or text abstracts", aft: "Author of afterword, colophon, etc.", aud: "Author of dialog", aui: "Author of introduction, etc.", ato: "Autographer", ant: "Bibliographic antecedent", bnd: "Binder", bdd: "Binding designer", blw: "Blurb writer", bkd: "Book designer", bkp: "Book producer", bjd: "Bookjacket designer", bpd: "Bookplate designer", bsl: "Bookseller", brl: "Braille embosser", brd: "Broadcaster", cll: "Calligrapher", ctg: "Cartographer", cas: "Caster", cns: "Censor", chr: "Choreographer", cng: "Cinematographer", cli: "Client", cor: "Collection registrar", col: "Collector", clt: "Collotyper", clr: "Colorist", cmm: "Commentator", cwt: "Commentator for written text", com: "Compiler", cpl: "Complainant", cpt: "Complainant-appellant", cpe: "Complainant-appellee", cmp: "Composer", cmt: "Compositor", ccp: "Conceptor", cnd: "Conductor", con: "Conservator", csl: "Consultant", csp: "Consultant to a project", cos: "Contestant", cot: "Contestant-appellant", coe: "Contestant-appellee", cts: "Contestee", ctt: "Contestee-appellant", cte: "Contestee-appellee", ctr: "Contractor", ctb: "Contributor", cpc: "Copyright claimant", cph: "Copyright holder", crr: "Corrector", crp: "Correspondent", cst: "Costume designer", cou: "Court governed", crt: "Court reporter", cov: "Cover designer", cre: "Creator", cur: "Curator", dnc: "Dancer", dtc: "Data contributor", dtm: "Data manager", dte: "Dedicatee", dto: "Dedicator", dfd: "Defendant", dft: "Defendant-appellant", dfe: "Defendant-appellee", dgg: "Degree granting institution", dgs: "Degree supervisor", dln: "Delineator", dpc: "Depicted", dpt: "Depositor", dsr: "Designer", drt: "Director", dis: "Dissertant", dbp: "Distribution place", dst: "Distributor", dnr: "Donor", drm: "Draftsman", dub: "Dubious author", edt: "Editor", edc: "Editor of compilation", edm: "Editor of moving image work", elg: "Electrician", elt: "Electrotyper", enj: "Enacting jurisdiction", eng: "Engineer", egr: "Engraver", etr: "Etcher", evp: "Event place", exp: "Expert", fac: "Facsimilist", fld: "Field director", fmd: "Film director", fds: "Film distributor", flm: "Film editor", fmp: "Film producer", fmk: "Filmmaker", fpy: "First party", frg: "Forger", fmo: "Former owner", fnd: "Funder", gis: "Geographic information specialist", hnr: "Honoree", hst: "Host", his: "Host institution", ilu: "Illuminator", ill: "Illustrator", ins: "Inscriber", itr: "Instrumentalist", ive: "Interviewee", ivr: "Interviewer", inv: "Inventor", isb: "Issuing body", jud: "Judge", jug: "Jurisdiction governed", lbr: "Laboratory", ldr: "Laboratory director", lsa: "Landscape architect", led: "Lead", len: "Lender", lil: "Libelant", lit: "Libelant-appellant", lie: "Libelant-appellee", lel: "Libelee", let: "Libelee-appellant", lee: "Libelee-appellee", lbt: "Librettist", lse: "Licensee", lso: "Licensor", lgd: "Lighting designer", ltg: "Lithographer", lyr: "Lyricist", mfp: "Manufacture place", mfr: "Manufacturer", mrb: "Marbler", mrk: "Markup editor", med: "Medium", mdc: "Metadata contact", mte: "Metal-engraver", mtk: "Minute taker", mod: "Moderator", mon: "Monitor", mcp: "Music copyist", msd: "Musical director", mus: "Musician", nrt: "Narrator", osp: "Onscreen presenter", opn: "Opponent", orm: "Organizer", org: "Originator", oth: "Other", own: "Owner", pan: "Panelist", ppm: "Papermaker", pta: "Patent applicant", pth: "Patent holder", pat: "Patron", prf: "Performer", pma: "Permitting agency", pht: "Photographer", ptf: "Plaintiff", ptt: "Plaintiff-appellant", pte: "Plaintiff-appellee", plt: "Platemaker", pra: "Praeses", pre: "Presenter", prt: "Printer", pop: "Printer of plates", prm: "Printmaker", prc: "Process contact", pro: "Producer", prn: "Production company", prs: "Production designer", pmn: "Production manager", prd: "Production personnel", prp: "Production place", prg: "Programmer", pdr: "Project director", pfr: "Proofreader", prv: "Provider", pup: "Publication place", pbl: "Publisher", pbd: "Publishing director", ppt: "Puppeteer", rdd: "Radio director", rpc: "Radio producer", rce: "Recording engineer", rcd: "Recordist", red: "Redaktor", ren: "Renderer", rpt: "Reporter", rps: "Repository", rth: "Research team head", rtm: "Research team member", res: "Researcher", rsp: "Respondent", rst: "Respondent-appellant", rse: "Respondent-appellee", rpy: "Responsible party", rsg: "Restager", rsr: "Restorationist", rev: "Reviewer", rbr: "Rubricator", sce: "Scenarist", sad: "Scientific advisor", aus: "Screenwriter", scr: "Scribe", scl: "Sculptor", spy: "Second party", sec: "Secretary", sll: "Seller", std: "Set designer", stg: "Setting", sgn: "Signer", sng: "Singer", sds: "Sound designer", spk: "Speaker", spn: "Sponsor", sgd: "Stage director", stm: "Stage manager", stn: "Standards body", str: "Stereotyper", stl: "Storyteller", sht: "Supporting host", srv: "Surveyor", tch: "Teacher", tcd: "Technical director", tld: "Television director", tlp: "Television producer", ths: "Thesis advisor", trc: "Transcriber", trl: "Translator", tyd: "Type designer", tyg: "Typographer", uvp: "University place", vdg: "Videographer", vac: "Voice actor", wit: "Witness", wde: "Wood engraver", wdc: "Woodcutter", wam: "Writer of accompanying material", wac: "Writer of added commentary", wal: "Writer of added lyrics", wat: "Writer of added text", win: "Writer of introduction", wpr: "Writer of preface", wst: "Writer of supplementary textual content"
}

export { worldCatScraper };
