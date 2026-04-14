INSERT INTO admin_books (
    title,
    description,
    is_created_by_user,
    userbook_status,
    is_added_from_admin,
    stock_status,
    quantity,
    production_page,
    height,
    thickness,
    width,
    security_label,
    has_coil,
    has_insert,
    has_tab,
    has_backcover,
    perf,
    double_sided_cover,
    shrinkwrap,
    three_hole_drill,
    text_paper_type,
    text_color,
    cover_finish_type,
    cover_color,
    cover_size,
    cover_paper_type,
    head_and_tail,
    binding_type,
    sale_price
)
SELECT
    'Notebook Essentials',
    'Minimal spiral notebook for office use.',
    0,
    'PUBLISHED',
    1,
    'IN_STOCK',
    120,
    96,
    297,
    12,
    210,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    'NONE',
    'FOUR_FOUR',
    'MATT',
    'FOUR_FOUR',
    'XL',
    'NONE',
    'NONE',
    'CASEBIND',
    19.90
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_books WHERE title = 'Notebook Essentials');

INSERT INTO admin_books (
    title, description, is_created_by_user, userbook_status, is_added_from_admin, stock_status,
    quantity, production_page, height, thickness, width,
    security_label, has_coil, has_insert, has_tab, has_backcover, perf, double_sided_cover, shrinkwrap, three_hole_drill,
    text_paper_type, text_color, cover_finish_type, cover_color, cover_size, cover_paper_type, head_and_tail, binding_type, sale_price
)
SELECT
    'Project Planner',
    'Planning book with strong hardcover finish.',
    0, 'PUBLISHED', 1, 'IN_STOCK',
    80, 140, 300, 18, 215,
    0, 0, 0, 0, 1, 0, 1, 0, 0,
    'NONE', 'FOUR_FOUR', 'MATT', 'FOUR_FOUR', 'XL', 'NONE', 'NONE', 'CASEBIND_ES', 24.50
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_books WHERE title = 'Project Planner');

INSERT INTO admin_books (
    title, description, is_created_by_user, userbook_status, is_added_from_admin, stock_status,
    quantity, production_page, height, thickness, width,
    security_label, has_coil, has_insert, has_tab, has_backcover, perf, double_sided_cover, shrinkwrap, three_hole_drill,
    text_paper_type, text_color, cover_finish_type, cover_color, cover_size, cover_paper_type, head_and_tail, binding_type, sale_price
)
SELECT
    'Training Manual',
    'Compact manual for internal documentation.',
    0, 'PUBLISHED', 1, 'IN_STOCK',
    60, 72, 280, 10, 200,
    0, 0, 0, 0, 1, 0, 1, 0, 0,
    'NONE', 'FOUR_FOUR', 'MATT', 'FOUR_FOUR', 'XL', 'NONE', 'NONE', 'PERFECT', 14.90
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_books WHERE title = 'Training Manual');

INSERT INTO admin_books (
    title, description, is_created_by_user, userbook_status, is_added_from_admin, stock_status,
    quantity, production_page, height, thickness, width,
    security_label, has_coil, has_insert, has_tab, has_backcover, perf, double_sided_cover, shrinkwrap, three_hole_drill,
    text_paper_type, text_color, cover_finish_type, cover_color, cover_size, cover_paper_type, head_and_tail, binding_type, sale_price
)
SELECT
    'Customer Workbook',
    'Workbook prepared for workshop sessions.',
    0, 'PUBLISHED', 1, 'IN_STOCK',
    45, 128, 297, 16, 210,
    0, 0, 0, 0, 1, 0, 1, 0, 0,
    'NONE', 'FOUR_FOUR', 'MATT', 'FOUR_FOUR', 'XL', 'NONE', 'NONE', 'CASEBIND_INS', 21.00
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_books WHERE title = 'Customer Workbook');

INSERT INTO admin_books (
    title, description, is_created_by_user, userbook_status, is_added_from_admin, stock_status,
    quantity, production_page, height, thickness, width,
    security_label, has_coil, has_insert, has_tab, has_backcover, perf, double_sided_cover, shrinkwrap, three_hole_drill,
    text_paper_type, text_color, cover_finish_type, cover_color, cover_size, cover_paper_type, head_and_tail, binding_type, sale_price
)
SELECT
    'Premium Lookbook',
    'Luxury brand lookbook designed for glossy showcase printing.',
    0, 'PUBLISHED', 1, 'IN_STOCK',
    30, 84, 300, 14, 210,
    0, 0, 0, 0, 1, 0, 1, 0, 0,
    'NONE', 'FOUR_FOUR', 'MATT', 'FOUR_FOUR', 'XL', 'NONE', 'NONE', 'PERFECT', 27.50
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_books WHERE title = 'Premium Lookbook');

INSERT INTO admin_books (
    title, description, is_created_by_user, userbook_status, is_added_from_admin, stock_status,
    quantity, production_page, height, thickness, width,
    security_label, has_coil, has_insert, has_tab, has_backcover, perf, double_sided_cover, shrinkwrap, three_hole_drill,
    text_paper_type, text_color, cover_finish_type, cover_color, cover_size, cover_paper_type, head_and_tail, binding_type, sale_price
)
SELECT
    'Campus Event Guide',
    'Event booklet with practical layouts for student and campus activities.',
    0, 'PUBLISHED', 1, 'IN_STOCK',
    75, 64, 280, 8, 200,
    0, 0, 0, 0, 1, 0, 1, 0, 0,
    'NONE', 'FOUR_FOUR', 'MATT', 'FOUR_FOUR', 'XL', 'NONE', 'NONE', 'SS', 11.90
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM admin_books WHERE title = 'Campus Event Guide');

INSERT INTO book_authors (book_id, author)
SELECT b.book_id, 'EPAC Studio'
FROM admin_books b
WHERE b.title = 'Notebook Essentials'
  AND NOT EXISTS (
      SELECT 1 FROM book_authors ba WHERE ba.book_id = b.book_id AND ba.author = 'EPAC Studio'
  );

INSERT INTO book_authors (book_id, author)
SELECT b.book_id, 'EPAC Team'
FROM admin_books b
WHERE b.title = 'Project Planner'
  AND NOT EXISTS (
      SELECT 1 FROM book_authors ba WHERE ba.book_id = b.book_id AND ba.author = 'EPAC Team'
  );

INSERT INTO book_authors (book_id, author)
SELECT b.book_id, 'Training Dept'
FROM admin_books b
WHERE b.title = 'Training Manual'
  AND NOT EXISTS (
      SELECT 1 FROM book_authors ba WHERE ba.book_id = b.book_id AND ba.author = 'Training Dept'
  );

INSERT INTO book_authors (book_id, author)
SELECT b.book_id, 'Support Team'
FROM admin_books b
WHERE b.title = 'Customer Workbook'
  AND NOT EXISTS (
      SELECT 1 FROM book_authors ba WHERE ba.book_id = b.book_id AND ba.author = 'Support Team'
  );

INSERT INTO book_authors (book_id, author)
SELECT b.book_id, 'Creative Studio'
FROM admin_books b
WHERE b.title = 'Premium Lookbook'
  AND NOT EXISTS (
      SELECT 1 FROM book_authors ba WHERE ba.book_id = b.book_id AND ba.author = 'Creative Studio'
  );

INSERT INTO book_authors (book_id, author)
SELECT b.book_id, 'Campus Print Lab'
FROM admin_books b
WHERE b.title = 'Campus Event Guide'
  AND NOT EXISTS (
      SELECT 1 FROM book_authors ba WHERE ba.book_id = b.book_id AND ba.author = 'Campus Print Lab'
  );
