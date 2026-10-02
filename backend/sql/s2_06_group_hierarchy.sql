ALTER TABLE `groups`
  ADD COLUMN parent_id INT NULL,
  ADD COLUMN leader_id INT NULL;

ALTER TABLE `groups`
  ADD KEY idx_groups_parent (parent_id),
  ADD UNIQUE KEY uq_groups_leader (leader_id),
  ADD CONSTRAINT fk_groups_parent FOREIGN KEY (parent_id) REFERENCES `groups`(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_groups_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD CONSTRAINT fk_users_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE RESTRICT;

UPDATE `groups` g
JOIN (SELECT group_id, MIN(id) AS uid FROM users WHERE role_id = 2 AND group_id IS NOT NULL GROUP BY group_id) t
  ON t.group_id = g.id
SET g.leader_id = t.uid;