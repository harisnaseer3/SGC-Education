/**
 * Application Constants
 */

const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  SCHOOL_ADMIN: 'school_admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

const INSTITUTION_TYPES = {
  SCHOOL: 'school',
  COLLEGE: 'college'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

module.exports = {
  USER_ROLES,
  INSTITUTION_TYPES,
  HTTP_STATUS
};
