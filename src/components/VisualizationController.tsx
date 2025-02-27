import React from 'react';
import EthereumTransactionBatching from './visualization';

const VisualizationController: React.FC = () => {
  // Very simplified component with no dependencies on server or API
  return (
    <div className="w-full bg-zinc-900 text-white rounded-lg">
      <div className="flex justify-end p-2">
        <span className="text-zinc-500 text-xs">Using local 3D visualization</span>
      </div>

      {/* Just render the visualization component without passing any props */}
      <EthereumTransactionBatching />
    </div>
  );
};

export default VisualizationController; 