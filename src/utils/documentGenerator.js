export const resolveDocumentTemplateId = (requestType) => {
  if (!requestType) return null;
  
  const type = requestType.trim().toLowerCase();
  
  if (type === 'barangay clearance') return 'barangay_clearance';
  if (type === 'certificate of residency') return 'certificate_of_residency';
  if (type === 'certificate of indigency') return 'certificate_of_indigency';
  if (type === 'business permit' || type === 'business clearance') return 'business_clearance';
  
  return null;
};

export const calculateAge = (dob) => {
  if (!dob) return '';
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const generateDocumentHTML = (request, settings) => {
  if (!request || !request.type) {
    throw new Error("Invalid request: Document type is missing.");
  }

  const templateId = resolveDocumentTemplateId(request.type);
  if (!templateId) {
    throw new Error("Document template not found for this request type.");
  }

  const defaultTemplateBodies = {
    barangay_clearance: "To Whom It May Concern:\n\nThis is to certify that MR./MRS. {{full_name}}, {{age}} years of age, {{civil_status}}, is cleared from all the obligations of this barangay, he/she has no derogatory records and that he/she has paid whatever liabilities he/she incurred as a resident of this barangay.\n\nThis clearance is issued upon request of the above named person for {{purpose}}.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.",
    certificate_of_residency: "To Whom It May Concern:\n\nThis is to certify that MR./MRS. {{full_name}}, of legal age, {{civil_status}}, whose signature appears below, is a bona fide resident of this barangay.\n\nBased on the records of this office, he/she has been residing at {{address}} since {{residing_since}}.\n\nThis certification is issued upon the request of the above named person for whatever legal purpose it may serve.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.",
    certificate_of_indigency: "To Whom It May Concern:\n\nThis is to certify that MR./MRS. {{full_name}}, {{age}} years of age, {{civil_status}}, is a bona fide resident of this barangay.\n\nThis further certifies that the above-named person belongs to an indigent family in this barangay and has no regular source of income to support their financial needs.\n\nThis certification is issued upon the request of the interested party for {{purpose}} purposes.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay.",
    business_clearance: "To Whom It May Concern:\n\nThis is to certify that the business or trade activity described below:\n\nBusiness Name: {{business_name}}\nLocation: {{business_address}}\nOperator/Manager: {{operator_name}}\n\nhas been granted a Barangay Business Permit to operate within the jurisdiction of this barangay, subject to the provisions of existing laws and ordinances.\n\nIssued this {{day}} day of {{month}} {{year}} at the office of the Barangay Captain at Buluan, Ipil, Zamboanga Sibugay."
  };

  const rawTemplate = settings?.documentTemplates?.[templateId] || defaultTemplateBodies[templateId];
  if (!rawTemplate) {
    throw new Error("Template content is empty. Please set it up in System Settings.");
  }

  const fullName = (request.name || request.fullName || '').toUpperCase();
  const age = calculateAge(request.dateOfBirth).toString();
  const civilStatus = request.civilStatus ? request.civilStatus.charAt(0).toUpperCase() + request.civilStatus.slice(1).toLowerCase() : '';
  const purpose = request.purpose === 'Other' ? (request.specifyPurpose || '') : (request.purpose || '');

  let formattedTemplate = rawTemplate;

  switch (templateId) {
    case 'barangay_clearance':
      formattedTemplate = formattedTemplate
        .replace(/{{full_name}}/gi, `<strong>${fullName}</strong>`)
        .replace(/{{age}}/gi, `<strong>${age}</strong>`)
        .replace(/{{civil_status}}/gi, `<strong>${civilStatus}</strong>`)
        .replace(/{{purpose}}/gi, `<strong>${purpose}</strong>`);
      break;
    case 'certificate_of_residency':
      formattedTemplate = formattedTemplate
        .replace(/{{full_name}}/gi, `<strong>${fullName}</strong>`)
        .replace(/{{civil_status}}/gi, `<strong>${civilStatus}</strong>`)
        .replace(/{{address}}/gi, `<strong>${request.address || ''}</strong>`)
        .replace(/{{residing_since}}/gi, `<strong>${request.lengthOfResidency || ''}</strong>`);
      break;
    case 'certificate_of_indigency':
      formattedTemplate = formattedTemplate
        .replace(/{{full_name}}/gi, `<strong>${fullName}</strong>`)
        .replace(/{{age}}/gi, `<strong>${age}</strong>`)
        .replace(/{{civil_status}}/gi, `<strong>${civilStatus}</strong>`)
        .replace(/{{purpose}}/gi, `<strong>${purpose}</strong>`);
      break;
    case 'business_clearance':
      formattedTemplate = formattedTemplate
        .replace(/{{business_name}}/gi, `<strong>${request.businessName || ''}</strong>`)
        .replace(/{{business_address}}/gi, `<strong>${request.businessAddress || ''}</strong>`)
        .replace(/{{operator_name}}/gi, `<strong>${fullName}</strong>`);
      break;
  }
    


  let issueDate = new Date();
  if (request.completedAt) {
    if (typeof request.completedAt.toDate === 'function') {
      issueDate = request.completedAt.toDate();
    } else if (request.completedAt instanceof Date) {
      issueDate = request.completedAt;
    } else {
      issueDate = new Date(request.completedAt);
    }
  }

  const getOrdinalDay = (d) => {
    if (d > 3 && d < 21) return d + 'th';
    switch (d % 10) {
      case 1:  return d + "st";
      case 2:  return d + "nd";
      case 3:  return d + "rd";
      default: return d + "th";
    }
  };

  const dayFormat = getOrdinalDay(issueDate.getDate());
  const monthFormat = issueDate.toLocaleString('default', { month: 'long' });
  const yearFormat = issueDate.getFullYear().toString();

  formattedTemplate = formattedTemplate
    .replace(/{{day}}/gi, `<strong>${dayFormat}</strong>`)
    .replace(/{{month}}/gi, `<strong>${monthFormat}</strong>`)
    .replace(/{{year}}/gi, `<strong>${yearFormat}</strong>`);
    
  // Replace all other tokens with blanks
  formattedTemplate = formattedTemplate.replace(/{{[\w_]+}}/g, '<strong>_________</strong>');

  return {
    templateId,
    html: formattedTemplate
  };
};
