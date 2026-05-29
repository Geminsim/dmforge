try {
  const lucide = require('lucide-react');
  if (lucide.Scissors) {
    console.log('Scissors icon is available!');
  } else {
    console.log('Scissors icon is NOT available in lucide-react.');
  }
} catch (err) {
  console.error('Error importing lucide-react:', err.message);
}
