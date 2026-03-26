// FumuGold — Doenças (Angola context)
export const DISEASES = {
  malaria:       { label: 'Malária', icd: 'B54', severity: 'high', color: '#FF3355' },
  hipertensao:   { label: 'Hipertensão', icd: 'I10', severity: 'medium', color: '#FF8C00' },
  diabetes:      { label: 'Diabetes Mellitus', icd: 'E11', severity: 'medium', color: '#FF8C00' },
  infarto:       { label: 'Enfarte do Miocárdio', icd: 'I21', severity: 'critical', color: '#FF0000' },
  tuberculose:   { label: 'Tuberculose', icd: 'A15', severity: 'high', color: '#FF3355' },
  dengue:        { label: 'Dengue', icd: 'A90', severity: 'high', color: '#FF3355' },
  colera:        { label: 'Cólera', icd: 'A00', severity: 'critical', color: '#FF0000' },
  febre_tifoide: { label: 'Febre Tifóide', icd: 'A01', severity: 'high', color: '#FF3355' },
  hiv_sida:      { label: 'VIH/SIDA', icd: 'B20', severity: 'high', color: '#AA66FF' },
  pneumonia:     { label: 'Pneumonia', icd: 'J18', severity: 'medium', color: '#FF8C00' },
  anemia:        { label: 'Anemia', icd: 'D64', severity: 'medium', color: '#4499FF' },
  asma:          { label: 'Asma', icd: 'J45', severity: 'medium', color: '#4499FF' },
  avc:           { label: 'AVC', icd: 'I64', severity: 'critical', color: '#FF0000' },
  cancer:        { label: 'Neoplasia', icd: 'C80', severity: 'critical', color: '#AA66FF' },
  insuf_renal:   { label: 'Insuficiência Renal', icd: 'N18', severity: 'high', color: '#FF3355' },
  gastroenterite:{ label: 'Gastroenterite', icd: 'A09', severity: 'low', color: '#00FF88' },
  fratura:       { label: 'Fractura Óssea', icd: 'S72', severity: 'medium', color: '#FF8C00' },
  apendicite:    { label: 'Apendicite', icd: 'K37', severity: 'high', color: '#FF3355' },
  outro:         { label: 'Outro', icd: 'Z99', severity: 'low', color: '#9A8A5A' },
};

export default DISEASES;
