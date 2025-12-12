import React from 'react';
import { Box, Typography, Breadcrumbs, Link, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { NavigateBefore, NavigateNext, Home } from '@mui/icons-material';

const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  showBackButton = true,
  backUrl,
  showNextButton = false,
  nextUrl,
  nextLabel = 'Next'
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const handleNext = () => {
    if (nextUrl) {
      navigate(nextUrl);
    }
  };

  return (
    <Box mb={3}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline="hover"
            color="inherit"
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              navigate('/dashboard');
            }}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <Home sx={{ mr: 0.5 }} fontSize="small" />
            Dashboard
          </Link>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={index} color="text.primary">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                href={crumb.path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(crumb.path);
                }}
                sx={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Header with Title and Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Action Buttons */}
        <Box display="flex" gap={1} alignItems="center">
          {showBackButton && (
            <Button
              variant="outlined"
              startIcon={<NavigateBefore />}
              onClick={handleBack}
              size="medium"
            >
              Back
            </Button>
          )}

          {actions}

          {showNextButton && nextUrl && (
            <Button
              variant="outlined"
              endIcon={<NavigateNext />}
              onClick={handleNext}
              size="medium"
            >
              {nextLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PageHeader;
