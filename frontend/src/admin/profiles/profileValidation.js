export const validateProfile = (values, { requireImage = true } = {}) => {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Enter your full name.';
  if (!values.email?.trim()) errors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.role?.trim()) errors.role = 'Enter your role at Living the Charge.';
  if (!values.department) errors.department = 'Select a department.';
  if (!values.quote?.trim()) errors.quote = 'Add a short quote.';
  if (values.quote?.length > 180) errors.quote = 'Keep your quote under 180 characters.';
  if (!values.bio?.trim()) errors.bio = 'Add a short biography.';
  if (values.bio?.length > 1000) errors.bio = 'Keep your biography under 1,000 characters.';
  if (requireImage && !values.image) errors.image = 'Add a professional portrait.';
  return errors;
};

export const validatePortrait = (file) => {
  if (!file) return 'Add a professional portrait.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return 'Please upload a JPEG, PNG or WebP image under 5 MB.';
  return '';
};
