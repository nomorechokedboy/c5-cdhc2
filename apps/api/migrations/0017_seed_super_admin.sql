-- Seed default super admin account
INSERT OR IGNORE INTO users (username, displayName, password, unitId, isSuperUser, status)
VALUES (
  'thont@cdhc2.edu.vn',
  'Nguyễn Trường Thọ',
  '$argon2id$v=19$m=65536,t=3,p=4$lH3GQVujE8cgksCGt9CCMQ$FYpnegVbaW+Q9lvMMnTqcRc8W+hs4OY9q/uiftlpqrs',
  1,
  1,
  'approved'
);
