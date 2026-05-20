/**
 * Application Constants
 */

const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'school_admin', // Deprecated, use ADMIN
  TEACHER: 'teacher',
  STUDENT: 'student',
  FINANCE_MANAGER: 'finance_manager'
};

const INSTITUTION_TYPES = {
  SCHOOL: 'school',
  COLLEGE: 'college'
};

const ADMISSION_STATUS = {
  PENDING: 'pending',
  STRUCK_OFF: 'struck_off',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ENROLLED: 'enrolled',
  CANCELLED: 'cancelled'
};

const STUDENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRANSFERRED: 'transferred',
  GRADUATED: 'graduated',
  EXPELLED: 'expelled',
  ON_LEAVE: 'on_leave',
  STRUCK_OFF: 'struck_off'
};

const PERMISSIONS = {
  USERS: {
    VIEW: 'user:view',
    CREATE: 'user:create',
    EDIT: 'user:edit',
    DELETE: 'user:delete'
  },
  INSTITUTIONS: {
    VIEW: 'institution:view',
    CREATE: 'institution:create',
    EDIT: 'institution:edit',
    DELETE: 'institution:delete'
  },
  ADMISSIONS: {
    VIEW: 'admission:view',
    CREATE: 'admission:create',
    EDIT: 'admission:edit',
    APPROVE: 'admission:approve'
  },
  ACADEMIC: {
    MANAGE: 'academic:manage',
    VIEW: 'academic:view'
  },
  FEES: {
    VIEW: 'fee:view',
    MANAGE: 'fee:manage',
    REPORT: 'fee:report',
    DELETE: 'fee:delete'
  },
  RESULTS: {
    VIEW: 'result:view',
    MANAGE: 'result:manage'
  },
  SYSTEM: {
    MANAGE: 'system:manage'
  },
  REPORTS: {
    VIEW: 'report:view'
  },
  ATTENDANCE: {
    MARK: 'attendance:mark',
    VIEW: 'attendance:view'
  }
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: ['*'], // All permissions
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.EDIT,
    PERMISSIONS.ADMISSIONS.VIEW,
    PERMISSIONS.ADMISSIONS.CREATE,
    PERMISSIONS.ACADEMIC.MANAGE,
    PERMISSIONS.FEES.VIEW,
    PERMISSIONS.FEES.MANAGE,
    PERMISSIONS.RESULTS.VIEW,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.ATTENDANCE.VIEW
  ],
  [USER_ROLES.TEACHER]: [
    PERMISSIONS.ACADEMIC.VIEW,
    PERMISSIONS.RESULTS.MANAGE,
    PERMISSIONS.ATTENDANCE.MARK,
    PERMISSIONS.ATTENDANCE.VIEW
  ],
  [USER_ROLES.STUDENT]: [
    PERMISSIONS.ACADEMIC.VIEW,
    PERMISSIONS.RESULTS.VIEW,
    PERMISSIONS.FEES.VIEW
  ]
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
  ADMISSION_STATUS,
  STUDENT_STATUS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  HTTP_STATUS
};
