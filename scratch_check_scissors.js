try {
  const lucide = require('./node_modules/lucide-react');
  if (lucide.Scissors) {
    console.log('Scissors icon is available!');
  } else {
    console.log('Scissors icon is NOT available in lucide-react.');
  }
} catch (err) {
  console.error('Error importing lucide-react:', err.message);
}
