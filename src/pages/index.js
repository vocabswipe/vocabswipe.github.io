export default function Home({ letters }) {
  console.log('Home letters:', letters);
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">VocabSwipe</h1>
      <p>Letters: {letters.join(', ')}</p>
    </div>
  );
}
export async function getStaticProps() {
  console.log('Running getStaticProps');
  try {
    const letters = getAvailableLetters();
    console.log('Letters:', letters);
    return { props: { letters } };
  } catch (error) {
    console.error('Error:', error);
    return { props: { letters: [] } };
  }
}
