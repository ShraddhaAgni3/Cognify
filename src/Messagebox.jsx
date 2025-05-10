import React from 'react';

function Messagebox({ question }) {
  return (
    <div className="rounded-full p-2 text-lg bg-gray-900 truncate hover:bg-gray-800 text-white">
      {question || 'No Question'} {/* fallback */}
    </div>
  );
}


export default Messagebox;
