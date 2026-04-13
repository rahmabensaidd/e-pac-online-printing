INSERT INTO `user` (
    `first_name`,
    `last_name`,
    `email`,
    `username`,
    `password`,
    `company_name`,
    `is_enabled`,
    `registration_date`,
    `role`,
    `user_type`
)
VALUES
    ('System', 'Admin', 'admin@epac.local', 'admin', '$2a$10$O3uBM7WlNqKkVyoj1wRXPerSX6lc9ftK07z4ksFHyd6fjv6bnkYSC', NULL, 1, CURDATE(), 'ADMIN', 'SIMPLE')
ON DUPLICATE KEY UPDATE
    `first_name` = VALUES(`first_name`),
    `last_name` = VALUES(`last_name`),
    `email` = VALUES(`email`),
    `username` = VALUES(`username`),
    `password` = VALUES(`password`),
    `is_enabled` = VALUES(`is_enabled`),
    `role` = VALUES(`role`),
    `user_type` = VALUES(`user_type`);

UPDATE `user`
SET `user_type` = 'SIMPLE'
WHERE `user_type` IS NULL;

INSERT INTO `user` (
    `first_name`,
    `last_name`,
    `email`,
    `username`,
    `password`,
    `company_name`,
    `is_enabled`,
    `registration_date`,
    `role`,
    `user_type`
)
VALUES
    ('Default', 'User', 'user@epac.local', 'user', '$2a$10$U/.Ahlsxf6jLW.kV6SMTL.Y3GS5BFlVMoAvj6LMMQr9J4FcyY7fq6', NULL, 1, CURDATE(), 'USER', 'SIMPLE')
ON DUPLICATE KEY UPDATE
    `first_name` = VALUES(`first_name`),
    `last_name` = VALUES(`last_name`),
    `email` = VALUES(`email`),
    `username` = VALUES(`username`),
    `password` = VALUES(`password`),
    `is_enabled` = VALUES(`is_enabled`),
    `role` = VALUES(`role`),
    `user_type` = VALUES(`user_type`);
