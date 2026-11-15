-- The 52 research targets from the specification (section 32), with the
-- initial priorities from section 48: workstream A and the first three
-- manufacturers (Dell, HP, Lenovo) at 1, workstreams B and C at 2, the rest at 3.
--
-- Names and categories only. These are research targets, not partners: no
-- website, contact, programme or relationship is recorded here, and none may
-- be inferred from this list. The founder can add, remove, re-prioritise and
-- re-categorise them in Admin -> Procurement -> Organisations.
--
-- Idempotent: an organisation that already exists (case-insensitive name) is left alone.

INSERT INTO "public"."Organisation" ("id", "name", "categories", "priority", "isResearchTarget", "notes")
SELECT gen_random_uuid()::text, v.name, v.categories, v.priority, true, 'Specification section 32 research target'
FROM (VALUES
  ('Getronics', ARRAY['field_engineering'], 1),
  ('Tata Consultancy Services (TCS)', ARRAY['field_engineering'], 2),
  ('Hemmersbach', ARRAY['field_engineering'], 2),
  ('Computacenter', ARRAY['field_engineering'], 2),
  ('SCC', ARRAY['field_engineering'], 2),
  ('IRON Service Global', ARRAY['field_engineering'], 2),
  ('Hibrant', ARRAY['field_engineering'], 1),
  ('Unisys', ARRAY['field_engineering'], 2),
  ('Ricoh', ARRAY['field_engineering'], 2),
  ('Fujitsu', ARRAY['field_engineering'], 2),
  ('DXC Technology', ARRAY['field_engineering'], 2),
  ('Softcat', ARRAY['field_engineering'], 2),
  ('1Install', ARRAY['field_engineering'], 2),
  ('JM2', ARRAY['field_engineering'], 2),
  ('D-Source', ARRAY['field_engineering'], 1),
  ('CGI', ARRAY['government_defence'], 2),
  ('Leidos', ARRAY['government_defence'], 2),
  ('BAE Systems', ARRAY['government_defence'], 2),
  ('QinetiQ', ARRAY['government_defence'], 2),
  ('Sopra Steria', ARRAY['government_defence'], 2),
  ('Thales', ARRAY['government_defence'], 2),
  ('Leonardo UK', ARRAY['government_defence'], 2),
  ('Capgemini', ARRAY['government_defence'], 2),
  ('Kyndryl', ARRAY['government_defence'], 2),
  ('Accenture', ARRAY['government_defence'], 3),
  ('Atos', ARRAY['government_defence'], 3),
  ('BT Business', ARRAY['government_defence'], 3),
  ('Dell Technologies', ARRAY['manufacturer'], 1),
  ('HP Inc.', ARRAY['manufacturer'], 1),
  ('Lenovo', ARRAY['manufacturer'], 1),
  ('Acer', ARRAY['manufacturer'], 3),
  ('ASUS', ARRAY['manufacturer'], 3),
  ('Samsung', ARRAY['manufacturer'], 3),
  ('Apple', ARRAY['manufacturer'], 3),
  ('Epson', ARRAY['manufacturer'], 3),
  ('Brother', ARRAY['manufacturer'], 3),
  ('Canon', ARRAY['manufacturer'], 3),
  ('Cisco', ARRAY['manufacturer'], 3),
  ('Hewlett Packard Enterprise', ARRAY['manufacturer'], 3),
  ('Insight', ARRAY['enterprise_distribution'], 3),
  ('CDW', ARRAY['enterprise_distribution'], 3),
  ('Bytes Technology Group', ARRAY['enterprise_distribution'], 3),
  ('Bechtle', ARRAY['enterprise_distribution'], 3),
  ('NTT DATA', ARRAY['enterprise_distribution'], 3),
  ('Wipro', ARRAY['enterprise_distribution'], 3),
  ('Infosys', ARRAY['enterprise_distribution'], 3),
  ('HCLTech', ARRAY['enterprise_distribution'], 3),
  ('Tech Mahindra', ARRAY['enterprise_distribution'], 3),
  ('TD SYNNEX', ARRAY['enterprise_distribution'], 3),
  ('Ingram Micro', ARRAY['enterprise_distribution'], 3),
  ('Westcoast', ARRAY['enterprise_distribution'], 3),
  ('Exclusive Networks', ARRAY['enterprise_distribution'], 3)
) AS v(name, categories, priority)
ON CONFLICT ((lower("name"))) DO NOTHING;
