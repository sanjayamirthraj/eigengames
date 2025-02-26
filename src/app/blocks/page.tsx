import BlockVisualization from "@/components/block-visualization";

export const metadata = {
  title: 'Block Stream | Eigen Games',
  description: 'Visualizing the most recent blocks with parallelization information',
};

export default function BlocksPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <BlockVisualization 
        autoRefresh={true}
        refreshInterval={10000}
        debugMode={false}
      />
    </div>
  );
} 