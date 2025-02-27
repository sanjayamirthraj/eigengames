//@ts-nocheck

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const EthereumTransactionBatching = () => {
  const batchMountRef = useRef(null);
  const individualMountRef = useRef(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [step, setStep] = useState(0);
  const [explanation, setExplanation] = useState('Click "Start Comparison" to begin');
  const [isInitialized, setIsInitialized] = useState(false);
  const [comparisonStats, setComparisonStats] = useState(null);

  // Initialize scene elements for batch processing
  const batchSceneRef = useRef(null);
  const batchRendererRef = useRef(null);
  const batchCameraRef = useRef(null);
  const batchTransactionsRef = useRef([]);
  const batchAnimationFrameRef = useRef(null);
  const batchMempoolRef = useRef(null);
  const batchContainersRef = useRef([]);
  const batchBlockRef = useRef(null);

  // Initialize scene elements for individual processing
  const indivSceneRef = useRef(null);   
  const indivRendererRef = useRef(null);
  const indivCameraRef = useRef(null);
  const indivTransactionsRef = useRef([]);
  const indivAnimationFrameRef = useRef(null);
  const indivMempoolRef = useRef(null);
  const indivBlockRef = useRef(null);

  // Add the highlight function near the top of the file, after imports but before component definition
  const pulseHighlight = (obj: THREE.Object3D, duration = 500) => {
    if (!obj) return;
    
    const material = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
    if (!material) return;
    
    const originalEmissive = material.emissive.clone();
    const originalEmissiveIntensity = material.emissiveIntensity;
    
    const startTime = Date.now();
    
    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use sine wave for pulsing effect
      const pulseIntensity = Math.sin(progress * Math.PI) * 0.5;
      
      // Set highlight color (bright green)
      material.emissive.set(0x00ff00);
      material.emissiveIntensity = pulseIntensity;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Reset to original values
        material.emissive.copy(originalEmissive);
        material.emissiveIntensity = originalEmissiveIntensity;
      }
    }
    
    update();
  };

  // Initialize scene elements for batch processing
  const initThreeJs = () => {
    if (!batchMountRef.current || !individualMountRef.current || isInitialized) return;
    
    // Initialize batch processing scene
    const batchScene = new THREE.Scene();
    batchScene.background = new THREE.Color(0x09090b); // zinc-950
    batchSceneRef.current = batchScene;
    
    const batchCamera = new THREE.PerspectiveCamera(
      60,
      batchMountRef.current.clientWidth / batchMountRef.current.clientHeight,
      0.1,
      1000
    );
    // Change camera to top-down view with slight angle
    batchCamera.position.set(0, 40, 10);
    batchCamera.lookAt(0, 0, 0);
    batchCameraRef.current = batchCamera;
    
    const batchRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    batchRenderer.setSize(batchMountRef.current.clientWidth, batchMountRef.current.clientHeight);
    batchRenderer.shadowMap.enabled = true;
    batchRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    while (batchMountRef.current.firstChild) {
      batchMountRef.current.removeChild(batchMountRef.current.firstChild);
    }
    batchMountRef.current.appendChild(batchRenderer.domElement);
    batchRendererRef.current = batchRenderer;

    // Initialize individual processing scene
    const indivScene = new THREE.Scene();
    indivScene.background = new THREE.Color(0x09090b); // zinc-950
    indivSceneRef.current = indivScene;
    
    const indivCamera = new THREE.PerspectiveCamera(
      60,
      individualMountRef.current.clientWidth / individualMountRef.current.clientHeight,
      0.1,
      1000
    );
    // Change camera to top-down view with slight angle
    indivCamera.position.set(0, 40, 10);
    indivCamera.lookAt(0, 0, 0);
    indivCameraRef.current = indivCamera;
    
    const indivRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    indivRenderer.setSize(individualMountRef.current.clientWidth, individualMountRef.current.clientHeight);
    indivRenderer.shadowMap.enabled = true;
    indivRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    while (individualMountRef.current.firstChild) {
      individualMountRef.current.removeChild(individualMountRef.current.firstChild);
    }
    individualMountRef.current.appendChild(indivRenderer.domElement);
    indivRendererRef.current = indivRenderer;
    
    // Add lighting to both scenes
    [batchScene, indivScene].forEach(scene => {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(10, 20, 15);
      mainLight.castShadow = true;
      scene.add(mainLight);
      
      const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.4);
      fillLight.position.set(-10, 10, -10);
      scene.add(fillLight);
      
      const backLight = new THREE.DirectionalLight(0xf1f5f9, 0.3);
      backLight.position.set(0, -10, -10);
      scene.add(backLight);
    });
    
    // Create visualizations for both scenes
    createBlockchain(batchScene, batchBlockRef);
    createBlockchain(indivScene, indivBlockRef);
    createMempool(batchScene, batchMempoolRef);
    createMempool(indivScene, indivMempoolRef);
    createBatchingArea(batchScene);
    
    // Set up animation loop for both scenes
    const animate = () => {
      batchAnimationFrameRef.current = requestAnimationFrame(animate);
      
      if (batchMempoolRef.current) {
        batchMempoolRef.current.rotation.y += 0.003;
      }
      if (indivMempoolRef.current) {
        indivMempoolRef.current.rotation.y += 0.003;
      }
      
      batchRenderer.render(batchScene, batchCamera);
      indivRenderer.render(indivScene, indivCamera);
    };
    
    animate();
    
    setIsInitialized(true);
  };

  useEffect(() => {
    // Initialize Three.js
    initThreeJs();
    
    // Handle window resize
    const handleResize = () => {
      if (!batchMountRef.current || !batchRendererRef.current || !batchCameraRef.current || !individualMountRef.current || !indivRendererRef.current || !indivCameraRef.current) return;
      
      const batchWidth = batchMountRef.current.clientWidth;
      const batchHeight = batchMountRef.current.clientHeight;
      const indivWidth = individualMountRef.current.clientWidth;
      const indivHeight = individualMountRef.current.clientHeight;
      
      batchCameraRef.current.aspect = batchWidth / batchHeight;
      batchCameraRef.current.updateProjectionMatrix();
      batchRendererRef.current.setSize(batchWidth, batchHeight);
      
      indivCameraRef.current.aspect = indivWidth / indivHeight;
      indivCameraRef.current.updateProjectionMatrix();
      indivRendererRef.current.setSize(indivWidth, indivHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle intersection observer to only render when visible
    const batchObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          initThreeJs();
        }
      },
      { threshold: 0.1 }
    );
    
    if (batchMountRef.current) {
      batchObserver.observe(batchMountRef.current);
    }
    
    const indivObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          initThreeJs();
        }
      },
      { threshold: 0.1 }
    );
    
    if (individualMountRef.current) {
      indivObserver.observe(individualMountRef.current);
    }
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (batchMountRef.current) {
        batchObserver.unobserve(batchMountRef.current);
      }
      
      if (individualMountRef.current) {
        indivObserver.unobserve(individualMountRef.current);
      }
      
      if (batchAnimationFrameRef.current) {
        cancelAnimationFrame(batchAnimationFrameRef.current);
      }
      
      if (indivAnimationFrameRef.current) {
        cancelAnimationFrame(indivAnimationFrameRef.current);
      }
      
      if (batchMountRef.current && batchRendererRef.current && batchRendererRef.current.domElement) {
        if (batchMountRef.current.contains(batchRendererRef.current.domElement)) {
          batchMountRef.current.removeChild(batchRendererRef.current.domElement);
        }
      }
      
      if (individualMountRef.current && indivRendererRef.current && indivRendererRef.current.domElement) {
        if (individualMountRef.current.contains(indivRendererRef.current.domElement)) {
          individualMountRef.current.removeChild(indivRendererRef.current.domElement);
        }
      }
      
      // Clean up any remaining geometries and materials
      if (batchSceneRef.current) {
        batchSceneRef.current.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      }
      
      if (indivSceneRef.current) {
        indivSceneRef.current.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
      
      if (batchRendererRef.current) {
        batchRendererRef.current.dispose();
      }
      
      if (indivRendererRef.current) {
        indivRendererRef.current.dispose();
      }
    };
  }, []);
  
  // Create blockchain visualization - adjust positions for better top-down view
  const createBlockchain = (scene, blockRef) => {
    if (!scene) return;
    
    const blockchainGroup = new THREE.Group();
    blockchainGroup.position.set(15, 0, 0); // Moved closer to center
    
    // Create several blocks
    for (let i = 0; i < 5; i++) {
      const blockGeo = new THREE.BoxGeometry(4, 2, 3);
      const blockMat = new THREE.MeshStandardMaterial({
        color: 0x27272a, // zinc-800
        metalness: 0.2,
        roughness: 0.3,
        emissive: 0x3f3f46, // zinc-700
        emissiveIntensity: 0.2
      });
      const block = new THREE.Mesh(blockGeo, blockMat);
      
      // Position blocks in a chain (X-axis only)
      block.position.set(i * 5, 0, 0);
      block.castShadow = true;
      block.receiveShadow = true;
      
      // Add hash lines connecting blocks
      if (i > 0) {
        const hashLineGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 8);
        const hashLineMat = new THREE.MeshBasicMaterial({ 
          color: 0x7c3aed, // purple-600
          transparent: true,
          opacity: 0.6
        });
        const hashLine = new THREE.Mesh(hashLineGeo, hashLineMat);
        hashLine.rotation.z = Math.PI / 2;
        hashLine.position.set(i * 5 - 2.5, 0, 0);
        blockchainGroup.add(hashLine);
      }
      
      blockchainGroup.add(block);
    }
    
    // Create newer block being processed
    const newBlockGeo = new THREE.BoxGeometry(4, 2, 3);
    const newBlockMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed, // purple-600
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      emissive: 0xa855f7, // purple-500
      emissiveIntensity: 0.2
    });
    const newBlock = new THREE.Mesh(newBlockGeo, newBlockMat);
    newBlock.position.set(25, 0, 0);
    newBlock.castShadow = true;
    newBlock.receiveShadow = true;
    blockRef.current = newBlock;
    
    const hashLineGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 8);
    const hashLineMat = new THREE.MeshBasicMaterial({ 
      color: 0x7c3aed, // purple-600
      transparent: true,
      opacity: 0.6
    });
    const hashLine = new THREE.Mesh(hashLineGeo, hashLineMat);
    hashLine.rotation.z = Math.PI / 2;
    hashLine.position.set(22.5, 0, 0);
    
    blockchainGroup.add(hashLine);
    blockchainGroup.add(newBlock);
    
    scene.add(blockchainGroup);
  };
  
  // Create mempool visualization - adjust positions for better top-down view
  const createMempool = (scene, mempoolRef) => {
    if (!scene) return;
    
    const mempoolGroup = new THREE.Group();
    mempoolGroup.position.set(-35, 0, 0); // Moved even further left to prevent overlap
    
    // Create a mempool container with glowing effect
    const geometry = new THREE.CylinderGeometry(7, 7, 1, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x18181b, // zinc-900
      transparent: true,
      opacity: 0.8,
      metalness: 0.2,
      roughness: 0.3,
      emissive: 0x27272a, // zinc-800
      emissiveIntensity: 0.2
    });
    const mempool = new THREE.Mesh(geometry, material);
    mempool.castShadow = true;
    mempool.receiveShadow = true;
    mempoolRef.current = mempool;
    mempoolGroup.add(mempool);
    
    // Add glow effect ring
    const glowGeo = new THREE.TorusGeometry(7.2, 0.2, 16, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0x9333ea, // purple-600
      transparent: true,
      opacity: 0.4
    });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.rotation.x = Math.PI / 2;
    mempoolGroup.add(glowRing);
    
    scene.add(mempoolGroup);
  };
  
  // Create batching area
  const createBatchingArea = (scene) => {
    if (!scene) return;
    
    const batchingGroup = new THREE.Group();
    batchingGroup.position.set(0, 0, 0); // Center position
    
    // Create batching area platform with glowing edges
    const geometry = new THREE.BoxGeometry(20, 0.5, 10);
    const material = new THREE.MeshStandardMaterial({
      color: 0x18181b, // zinc-900
      transparent: true,
      opacity: 0.9,
      metalness: 0.2,
      roughness: 0.3,
      emissive: 0x27272a, // zinc-800
      emissiveIntensity: 0.2
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.y = 0;
    platform.receiveShadow = true;
    batchingGroup.add(platform);
    
    // Add platform glow edges
    const edgeGeo = new THREE.BoxGeometry(20.2, 0.1, 10.2);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea, // purple-600
      transparent: true,
      opacity: 0.4
    });
    const edges = new THREE.Mesh(edgeGeo, edgeMat);
    edges.position.y = 0.2;
    batchingGroup.add(edges);
    
    // Create batch containers
    const batchPositions = [
      { x: -7.5, z: 0 },
      { x: -2.5, z: 0 },
      { x: 2.5, z: 0 },
      { x: 7.5, z: 0 }
    ];
    
    const batches = [];
    
    batchPositions.forEach((pos) => {
      const batchGeo = new THREE.BoxGeometry(4, 0.5, 6);
      const batchMat = new THREE.MeshStandardMaterial({
        color: 0x27272a, // zinc-800
        transparent: true,
        opacity: 0.9,
        metalness: 0.2,
        roughness: 0.3,
        emissive: 0x3f3f46, // zinc-700
        emissiveIntensity: 0.2
      });
      const batch = new THREE.Mesh(batchGeo, batchMat);
      batch.position.set(pos.x, 0.5, pos.z);
      batch.castShadow = true;
      batch.receiveShadow = true;
      batchingGroup.add(batch);
      batches.push(batch);
      
      // Add glow effect to batch containers
      const batchGlow = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.1, 6.2),
        new THREE.MeshBasicMaterial({
          color: 0x9333ea, // purple-600
          transparent: true,
          opacity: 0.3
        })
      );
      batchGlow.position.set(pos.x, 0.8, pos.z);
      batchingGroup.add(batchGlow);
    });
    
    batchContainersRef.current = batches;
    scene.add(batchingGroup);
  };
  
  // Create transaction object with enhanced visuals
  const createTransaction = (id, state) => {
    const geometry = new THREE.BoxGeometry(0.8, 0.3, 0.8);
    
    let color, emissiveColor, emissiveIntensity;
    switch (state) {
      case 0: 
        color = 0x22c55e; // Bright green
        emissiveColor = 0x15803d;
        emissiveIntensity = 0.2;
        break;
      case 1: 
        color = 0x3b82f6; // Bright blue
        emissiveColor = 0x1d4ed8;
        emissiveIntensity = 0.2;
        break;
      case 2: 
        color = 0xfacc15; // Bright yellow
        emissiveColor = 0xca8a04;
        emissiveIntensity = 0.2;
        break;
      case 3: 
        color = 0xef4444; // Bright red
        emissiveColor = 0xb91c1c;
        emissiveIntensity = 0.2;
        break;
      case 4: 
        color = 0xa855f7; // Bright purple
        emissiveColor = 0x7e22ce;
        emissiveIntensity = 0.2;
        break;
      default: 
        color = 0x94a3b8;
        emissiveColor = 0x64748b;
        emissiveIntensity = 0.1;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.2,
      emissive: emissiveColor,
      emissiveIntensity: emissiveIntensity
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store transaction data
    mesh.userData = {
      id: id,
      state: state,
      batch: null,
      fee: Math.random() * 0.5 + 0.1 // Random fee between 0.1 and 0.6 ETH
    };
    
    return mesh;
  };
  
  // Generate transactions
  const generateTransactions = (scene, mempoolRef, transactionsRef) => {
    if (!scene || !mempoolRef.current) return [];
    
    const transactions = [];
    
    // Clear any existing transactions
    transactionsRef.current.forEach(tx => {
      if (scene) scene.remove(tx);
    });
    
    transactionsRef.current = [];
    
    // Get mempool position
    const mempoolPosition = new THREE.Vector3(-35, 0, 0); // Updated position to match createMempool
    
    // Create new transactions
    for (let i = 0; i < 20; i++) {
      const state = Math.floor(Math.random() * 5);
      const tx = createTransaction(`tx-${i}`, state);
      
      if (tx) {
        // Random position within mempool cylinder
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5; // Slightly smaller than mempool radius
        tx.position.set(
          mempoolPosition.x + Math.cos(angle) * radius,
          mempoolPosition.y + Math.random() * 0.5 + 0.5, // Slightly raised for visibility
          mempoolPosition.z + Math.sin(angle) * radius
        );
        
        scene.add(tx);
        transactions.push(tx);
        transactionsRef.current.push(tx);
      }
    }
    
    return transactions;
  };
  
  // Batch transactions by state
  const batchTransactions = (transactions) => {
    const batches = [[], [], [], []];
    const statesInBatch = [{}, {}, {}, {}];
    
    // Make a copy to avoid modifying original
    const pendingTxs = [...transactions];
    
    while (pendingTxs.length > 0) {
      const tx = pendingTxs.shift();
      if (!tx) continue;
      
      let assigned = false;
      const txState = tx.userData.state;
      
      // Try to assign to a batch
      for (let i = 0; i < batches.length; i++) {
        // Check if batch is full (max 6 txs per batch)
        if (batches[i].length >= 6) continue;
        
        // Check if state already in batch
        if (statesInBatch[i][txState]) continue;
        
        // Add to batch
        batches[i].push(tx);
        tx.userData.batch = i;
        statesInBatch[i][txState] = true;
        assigned = true;
        break;
      }
      
      // If couldn't assign to any batch, add to least full batch
      if (!assigned) {
        let minBatchSize = Infinity;
        let minBatchIndex = 0;
        
        for (let i = 0; i < batches.length; i++) {
          if (batches[i].length < minBatchSize) {
            minBatchSize = batches[i].length;
            minBatchIndex = i;
          }
        }
        
        batches[minBatchIndex].push(tx);
        tx.userData.batch = minBatchIndex;
      }
    }
    
    return batches;
  };
  
  // Helper for animation
  const animatePosition = (object, targetPosition, duration) => {
    return new Promise(resolve => {
      const startPosition = { 
        x: object.position.x,
        y: object.position.y, 
        z: object.position.z 
      };
      const startTime = Date.now();
      
      function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        object.position.x = startPosition.x + (targetPosition.x - startPosition.x) * progress;
        object.position.y = startPosition.y + (targetPosition.y - startPosition.y) * progress;
        object.position.z = startPosition.z + (targetPosition.z - startPosition.z) * progress;
        
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          resolve();
        }
      }
      
      update();
    });
  };
  
  // Helper for camera animation
  const animateCamera = (camera, targetPosition, targetLookAt, duration) => {
    return new Promise(resolve => {
      const startPosition = { 
        x: camera.position.x,
        y: camera.position.y, 
        z: camera.position.z 
      };
      
      // Get current lookAt by creating a vector from camera position to current target
      const startLookAt = new THREE.Vector3(0, 0, 0);
      camera.getWorldDirection(startLookAt);
      startLookAt.multiplyScalar(100).add(camera.position); // Extend the direction vector and add camera position
      
      const startTime = Date.now();
      
      function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease in/out curve for smoother motion
        const easedProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        
        // Update camera position
        camera.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easedProgress;
        camera.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easedProgress;
        camera.position.z = startPosition.z + (targetPosition.z - startPosition.z) * easedProgress;
        
        // Update lookAt
        const lookAtX = startLookAt.x + (targetLookAt.x - startLookAt.x) * easedProgress;
        const lookAtY = startLookAt.y + (targetLookAt.y - startLookAt.y) * easedProgress;
        const lookAtZ = startLookAt.z + (targetLookAt.z - startLookAt.z) * easedProgress;
        
        camera.lookAt(lookAtX, lookAtY, lookAtZ);
        
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
          resolve();
        }
      }
      
      update();
    });
  };
  
  // Run individual transaction simulation (traditional Ethereum)
  const runIndividualSimulation = async () => {
    if (!indivSceneRef.current || !indivCameraRef.current) return;
    
    const startTime = performance.now();
    let transactionsProcessed = 0;
    
    try {
      // Reset camera to overview position
      const camera = indivCameraRef.current;
      await animateCamera(
        camera,
        { x: 0, y: 40, z: 10 },
        { x: 0, y: 0, z: 0 },
        1000
      );
      
      // Step 1: Generate transactions in mempool
      setStep(1);
      setExplanation('Step 1: Transactions enter the mempool (Individual Processing)');
      
      // Move camera to focus on mempool
      await animateCamera(
        camera,
        { x: -35, y: 15, z: 15 },  // Updated to new mempool position
        { x: -35, y: 0, z: 0 },    // Updated to new mempool position
        1500
      );
      
      const transactions = generateTransactions(indivSceneRef.current, indivMempoolRef, indivTransactionsRef);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Sort transactions by fee (highest first)
      setStep(2);
      setExplanation('Step 2: Transactions are sorted by fee (highest fee first)');
      
      // Highlight each transaction briefly to simulate analysis
      for (const tx of transactions) {
        const originalColor = tx.material.color.clone();
        tx.material.color.set(0xffffff);
        await new Promise(resolve => setTimeout(resolve, 30));
        tx.material.color.copy(originalColor);
      }
      
      // Sort transactions by fee (highest first)
      transactions.sort((a, b) => b.userData.fee - a.userData.fee);
      
      // Show sorting animation - move higher fee transactions slightly up
      const sortingPromises = [];
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const sortHeight = 0.2 + (transactions.length - i) * 0.05; // Higher fee = higher position
        sortingPromises.push(
          animatePosition(tx, {
            x: tx.position.x,
            y: tx.position.y + sortHeight,
            z: tx.position.z
          }, 500)
        );
      }
      
      await Promise.all(sortingPromises);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 3: Process transactions by filling blocks sequentially
      setStep(3);
      setExplanation('Step 3: Transactions fill blocks sequentially by fee (traditional method)');
      
      // Move camera to midway position to see paths between mempool and blockchain
      await animateCamera(
        camera,
        { x: -5, y: 25, z: 20 }, // Updated midway position to account for wider spacing
        { x: -5, y: 0, z: 0 },
        1500
      );
      
      // Create blocks to fill
      const blocks = [
        { position: { x: 15, y: 0, z: -3 }, transactions: [] }, // Adjusted position to match createBlockchain
        { position: { x: 15, y: 0, z: 3 }, transactions: [] }
      ];
      
      let currentBlockIndex = 0;
      
      // Process transactions in fee order
      for (let txIndex = 0; txIndex < transactions.length; txIndex++) {
        const tx = transactions[txIndex];
        
        // Focus camera on current transaction with smoother motion
        await animateCamera(
          camera,
          { 
            x: tx.position.x + 3, // Reduced offset for closer view
            y: txIndex === 0 ? 12 : 10, // Higher on first transaction for context
            z: tx.position.z + 3  // Reduced offset for closer view
          },
          { x: tx.position.x, y: tx.position.y, z: tx.position.z },
          txIndex === 0 ? 800 : 400 // Longer for first transaction, quicker for subsequent ones
        );
        
        // Highlight the active transaction
        tx.material.color.set(0x22c55e); // Bright green
        tx.material.emissive.set(0x15803d);
        tx.material.emissiveIntensity = 0.5;
        
        // Add visual indicator for active transaction
        const indicatorGeo = new THREE.TorusGeometry(0.8, 0.1, 16, 32);
        const indicatorMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          transparent: true,
          opacity: 0.7
        });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.set(tx.position.x, tx.position.y + 0.5, tx.position.z);
        indicator.rotation.x = Math.PI / 2;
        indivSceneRef.current.add(indicator);
        
        // Determine which block to fill
        const currentBlock = blocks[currentBlockIndex];
        currentBlock.transactions.push(tx);
        
        // If current block is full (10 transactions), move to next block
        if (currentBlock.transactions.length >= 10) {
          currentBlockIndex = (currentBlockIndex + 1) % blocks.length;
        }
        
        // Add a visual connection line between transaction and target block
        const pathGeo = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(tx.position.x, tx.position.y, tx.position.z),
            new THREE.Vector3((tx.position.x + currentBlock.position.x) * 0.5, 
                     tx.position.y + 5, // Higher arc for better visibility
                     (tx.position.z + currentBlock.position.z) * 0.5),
            new THREE.Vector3(currentBlock.position.x, currentBlock.position.y, currentBlock.position.z) // End directly at block center
          ]),
          64, // path segments
          0.1, // tube radius
          8, // tubular segments
          false // closed
        );
        
        const pathMat = new THREE.MeshBasicMaterial({
          color: 0x22c55e,
          transparent: true,
          opacity: 0.6,
        });
        
        const path = new THREE.Mesh(pathGeo, pathMat);
        indivSceneRef.current.add(path);
        
        // Move camera to follow the path
        await animateCamera(
          camera,
          { x: currentBlock.position.x - 5, y: 12, z: currentBlock.position.z + 5 },
          { x: currentBlock.position.x, y: 0, z: currentBlock.position.z },
          600
        );
        
        // Calculate final position in blockchain block
        if (!indivBlockRef.current) continue;
        
        const txCountInBlock = currentBlock.transactions.length - 1; // Current position in block
        const row = Math.floor(txCountInBlock / 3);
        const col = txCountInBlock % 3;
        const finalPosition = {
          x: currentBlock.position.x - 0.5 + col * 0.5, // Position within block width
          y: currentBlock.position.y - 0.5 + row * 0.4, // Position below center to ensure inside
          z: currentBlock.position.z  // Centered on z-axis
        };
        
        // Scale down transaction for block
        tx.scale.set(0.4, 0.4, 0.4);
        
        // Get position along the path
        const getPathPosition = (progress) => {
          // Sample the path at the given progress (0-1)
          const point = pathGeo.parameters.path.getPointAt(progress);
          
          return {
            x: point.x,
            y: point.y,
            z: point.z
          };
        };
        
        // Animate along the path
        const startTime = Date.now();
        const duration = 1000; // Slower for more clarity
        
        await new Promise(resolve => {
          function update() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Get position along the path
            if (progress < 0.7) {
              // First 70% of animation follows the path
              const pathProgress = progress / 0.7;
              const pathPos = getPathPosition(pathProgress);
              tx.position.set(pathPos.x, pathPos.y, pathPos.z);
            } else {
              // Last 30% moves to final position with easing
              const finalProgress = (progress - 0.7) / 0.3;
              
              // Use easing function for smoother entry
              const easedProgress = 1 - Math.pow(1 - finalProgress, 3); // Cubic ease out
              
              const finalPos = finalPosition;
              const pathPos = getPathPosition(1);
              
              tx.position.x = pathPos.x + (finalPos.x - pathPos.x) * easedProgress;
              tx.position.y = pathPos.y + (finalPos.y - pathPos.y) * easedProgress;
              tx.position.z = pathPos.z + (finalPos.z - pathPos.z) * easedProgress;
            }
            
            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              // Add pulse highlight when transaction enters block
              pulseHighlight(currentBlock);
              resolve();
            }
          }
          
          update();
        });
        
        // Increment counter for statistics
        transactionsProcessed++;
        
        // Remove the path and indicator
        indivSceneRef.current.remove(path);
        indivSceneRef.current.remove(indicator);
        
        // Reset transaction material
        tx.material.color.set(0x94a3b8); // Gray out processed transaction
        tx.material.emissive.set(0x64748b);
        tx.material.emissiveIntensity = 0.1;
        
        // Show transaction count and time in UI
        const currentTime = performance.now();
        const elapsed = ((currentTime - startTime) / 1000).toFixed(1);
        setExplanation(`Processed ${transactionsProcessed}/${transactions.length} transactions (${elapsed}s elapsed)`);
        
        // Small pause between transactions
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // If we've filled a block (10 transactions), pause to show the filled block
        if (txIndex > 0 && txIndex % 10 === 9) {
          // Highlight the filled block
          if (indivBlockRef.current) {
            // Move camera to focus on the filled block
            await animateCamera(
              camera,
              { x: indivBlockRef.current.position.x - 5, y: 8, z: indivBlockRef.current.position.z + 5 },
              { x: indivBlockRef.current.position.x, y: 0, z: indivBlockRef.current.position.z },
              800
            );
            
            // Add visual completion effect for filled block
            const blockCompletionFlash = new THREE.Mesh(
              new THREE.SphereGeometry(1, 16, 16),
              new THREE.MeshBasicMaterial({
                color: 0x10b981,
                transparent: true,
                opacity: 0.8
              })
            );
            blockCompletionFlash.position.set(
              indivBlockRef.current.position.x,
              indivBlockRef.current.position.y + 1,
              indivBlockRef.current.position.z
            );
            indivSceneRef.current.add(blockCompletionFlash);
            
            // Animate the flash growing and fading
            const animateBlockFlash = () => {
              return new Promise(resolve => {
                let scale = 1;
                let opacity = 0.8;
                const flashInterval = setInterval(() => {
                  scale += 0.2;
                  opacity -= 0.1;
                  blockCompletionFlash.scale.set(scale, scale, scale);
                  blockCompletionFlash.material.opacity = opacity;
                  
                  if (opacity <= 0) {
                    clearInterval(flashInterval);
                    indivSceneRef.current.remove(blockCompletionFlash);
                    resolve();
                  }
                }, 50);
              });
            };
            
            // Run block flash animation
            await animateBlockFlash();
            
            const filledBlockIndex = Math.floor(txIndex / 10);
            // Flash the block
            for (let flash = 0; flash < 3; flash++) {
              indivBlockRef.current.material.emissiveIntensity = 0.5;
              await new Promise(resolve => setTimeout(resolve, 100));
              indivBlockRef.current.material.emissiveIntensity = 0.2;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Show block is mined - focus on the blockchain
      if (indivBlockRef.current) {
        await animateCamera(
          camera,
          { x: 15, y: 10, z: 10 },
          { x: 15, y: 0, z: 0 },
          1000
        );
        
        indivBlockRef.current.material.color.set(0x10b981);
      }
      
      // Zoom out to show the full scene after completion
      await animateCamera(
        camera,
        { x: 0, y: 30, z: 20 },
        { x: 0, y: 0, z: 0 },
        1500
      );
      
      // Calculate final statistics
      const endTime = performance.now();
      const totalTimeIndividual = endTime - startTime;
      
      setComparisonStats(prevStats => ({
        ...prevStats,
        individual: {
          time: totalTimeIndividual,
          count: transactionsProcessed
        }
      }));
      
      setExplanation(`Individual processing complete: ${transactionsProcessed} transactions in ${(totalTimeIndividual/1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error("Individual simulation error:", error);
    }
  };
  
  // Run batch simulation (optimized method)
  const runBatchSimulation = async () => {
    if (!batchSceneRef.current || !batchCameraRef.current) return;
    
    const startTime = performance.now();
    let transactionsProcessed = 0;
    
    try {
      // Reset camera to overview position
      const camera = batchCameraRef.current;
      await animateCamera(
        camera,
        { x: 0, y: 40, z: 10 },
        { x: 0, y: 0, z: 0 },
        1000
      );
      
      // Step 1: Generate transactions in mempool
      setStep(1);
      setExplanation('Step 1: Transactions enter the mempool (Batch Processing with EigenLayer AVS)');
      
      // Move camera to focus on mempool
      await animateCamera(
        camera,
        { x: -35, y: 15, z: 15 },  // Updated to new mempool position
        { x: -35, y: 0, z: 0 },    // Updated to new mempool position
        1500
      );
      
      const transactions = generateTransactions(batchSceneRef.current, batchMempoolRef, batchTransactionsRef);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Analyze transactions
      setStep(2);
      setExplanation('Step 2: Transactions are analyzed for state conflicts using EigenLayer AVS compute');
      
      // Highlight each transaction briefly to simulate analysis
      for (const tx of transactions) {
        const originalColor = tx.material.color.clone();
        tx.material.color.set(0xffffff);
        await new Promise(resolve => setTimeout(resolve, 30)); // Faster analysis
        tx.material.color.copy(originalColor);
      }
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 3: Batch transactions
      setStep(3);
      setExplanation('Step 3: EigenLayer AVS batches transactions based on state compatibility for parallel processing');
      
      // Move camera to focus on batching area with a wider view to see transactions coming from mempool
      await animateCamera(
        camera,
        { x: -15, y: 20, z: 15 }, // Adjusted position to see mempool and batching area with wider view
        { x: -10, y: 0, z: 0 },  // Adjusted target to allow seeing both mempool and batching area
        1500
      );
      
      const batches = batchTransactions(transactions);
      
      // Update batch container colors
      for (let i = 0; i < batches.length; i++) {
        if (batches[i].length > 0 && batchContainersRef.current[i]) {
          batchContainersRef.current[i].material.color.set(0x3b82f6);
          batchContainersRef.current[i].material.opacity = 0.8;
        }
      }
      
      // FIRST PHASE: Move all transactions to their respective batches
      // Process batches in parallel for faster animation
      const batchingPromises = [];
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchContainer = batchContainersRef.current[batchIndex];
        
        if (batch.length > 0 && batchContainer) {
          // Highlight batch and focus camera on it
          batchContainer.material.color.set(0x10b981);
          
          await animateCamera(
            camera,
            { x: batchContainer.position.x, y: 10, z: batchContainer.position.z + 10 },
            { x: batchContainer.position.x, y: 0, z: batchContainer.position.z },
            600
          );
        
          // Create promises for all transactions in this batch
        for (let txIndex = 0; txIndex < batch.length; txIndex++) {
          const tx = batch[txIndex];
          
            // Calculate position in batch container
          const rowCol = txIndex < 3 ? 
            { row: 0, col: txIndex } : 
            { row: 1, col: txIndex - 3 };
          
            // Position relative to batch container
            const batchPos = batchContainer.position;
            const batchTargetPosition = {
              x: batchPos.x - 1.5 + rowCol.col * 1.2,
              y: batchPos.y + 0.5,
              z: batchPos.z - 1.5 + rowCol.row * 1.5
            };
            
            // Create a promise for this transaction's animation
            const animationPromise = (async () => {
              // Animate to batch with faster arc motion
              const midPoint = {
                x: (tx.position.x + batchTargetPosition.x) * 0.5,
                y: Math.max(tx.position.y, batchTargetPosition.y) + 3, // Lower arc height for top-down view
                z: (tx.position.z + batchTargetPosition.z) * 0.5
              };
              
              // First animate up in an arc
              await animatePosition(tx, {
                x: midPoint.x,
                y: midPoint.y,
                z: midPoint.z
              }, 500); // Faster animation
              
              // Then animate down to batch position
              await animatePosition(tx, batchTargetPosition, 500); // Faster animation
            })();
            
            batchingPromises.push(animationPromise);
          }
        }
      }
      
      // Wait for all batching animations to complete
      await Promise.all(batchingPromises);
      
      // Short pause after all transactions are batched
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Submit batches to blockchain
      setStep(4);
      setExplanation('Step 4: EigenLayer AVS submits optimized transaction batches to the new block');
      
      // Move camera to see both batching area and blockchain
      await animateCamera(
        camera,
        { x: 5, y: 20, z: 20 },
        { x: 5, y: 0, z: 0 },
        1500
      );
      
      // SECOND PHASE: Move batches to blockchain
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchContainer = batchContainersRef.current[batchIndex];
        
        if (batch.length > 0 && batchContainer) {
          // Highlight the active batch with pulsing effect
          batchContainer.material.color.set(0x22c55e); // Bright green
          batchContainer.material.emissive.set(0x15803d);
          batchContainer.material.emissiveIntensity = 0.5;
          
          // Focus camera on active batch
          await animateCamera(
            camera,
            { x: batchContainer.position.x, y: 10, z: batchContainer.position.z + 8 },
            { x: batchContainer.position.x, y: 1, z: batchContainer.position.z },
            800
          );
          
          // Add visual indicator for active batch
          const indicatorGeo = new THREE.TorusGeometry(2.5, 0.1, 16, 32);
          const indicatorMat = new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.7
          });
          const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
          indicator.position.set(batchContainer.position.x, batchContainer.position.y + 1, batchContainer.position.z);
          indicator.rotation.x = Math.PI / 2;
          batchSceneRef.current.add(indicator);
          
          // Pulse animation for indicator
          const startTime = Date.now();
          const pulseAnimation = () => {
            const elapsed = Date.now() - startTime;
            const scale = 1 + 0.2 * Math.sin(elapsed * 0.01);
            indicator.scale.set(scale, scale, scale);
            
            if (elapsed < 1000) {
              requestAnimationFrame(pulseAnimation);
            }
          };
          pulseAnimation();
          
          // Group transactions visually before sending to blockchain
          const groupCenter = new THREE.Vector3(
            batchContainer.position.x,
            batchContainer.position.y + 1.5,
            batchContainer.position.z
          );
          
          // First gather transactions in formation above batch
          const gatherPromises = [];
          
          for (let txIndex = 0; txIndex < batch.length; txIndex++) {
            const tx = batch[txIndex];
            
            // Scale down transaction for block
            tx.scale.set(0.5, 0.5, 0.5);
            
            // Calculate position in formation
            const angle = (txIndex / batch.length) * Math.PI * 2;
            const radius = 1.5;
            const formationPos = {
              x: groupCenter.x + Math.cos(angle) * radius,
              y: groupCenter.y + 0.5,
              z: groupCenter.z + Math.sin(angle) * radius
            };
            
            // Create a promise for gathering animation
            const gatherPromise = animatePosition(tx, formationPos, 400);
            gatherPromises.push(gatherPromise);
          }
          
          // Wait for all transactions to gather
          await Promise.all(gatherPromises);
          
          // Move camera to follow batch to blockchain
          await animateCamera(
            camera,
            { x: (batchContainer.position.x + batchBlockRef.current.position.x) / 2, y: 15, z: 15 },
            { x: (batchContainer.position.x + batchBlockRef.current.position.x) / 2, y: 0, z: 0 },
            800
          );
          
          // Add a visual connection line between batch and blockchain
          const pathGeo = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(batchContainer.position.x, batchContainer.position.y + 1.5, batchContainer.position.z),
              new THREE.Vector3((batchContainer.position.x + batchBlockRef.current.position.x) * 0.5, 
                                batchContainer.position.y + 5, // Higher arc
                                (batchContainer.position.z + batchBlockRef.current.position.z) * 0.5),
              new THREE.Vector3(batchBlockRef.current.position.x, batchBlockRef.current.position.y, batchBlockRef.current.position.z) // End at block center
            ]),
            64, // path segments
            0.1, // tube radius
            8, // tubular segments
            false // closed
          );
          
          const pathMat = new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.6,
          });
          
          const path = new THREE.Mesh(pathGeo, pathMat);
          batchSceneRef.current.add(path);
          
          // Fade in path
          const fadeInPath = () => {
            return new Promise(resolve => {
              let opacity = 0;
              const fadeInterval = setInterval(() => {
                opacity += 0.05;
                pathMat.opacity = opacity;
                
                if (opacity >= 0.6) {
                  clearInterval(fadeInterval);
                  resolve();
                }
              }, 30);
            });
          };
          
          await fadeInPath();
          
          // Now move transactions to blockchain along the path
          const blockchainPromises = [];
          
          // Focus camera on blockchain target
          await animateCamera(
            camera, 
            { x: batchBlockRef.current.position.x - 5, y: 10, z: batchBlockRef.current.position.z + 5 },
            { x: batchBlockRef.current.position.x, y: 0, z: batchBlockRef.current.position.z },
            800
          );
          
          // Calculate final positions in blockchain block
          const finalPositions = [];
          for (let txIndex = 0; txIndex < batch.length; txIndex++) {
            const row = Math.floor(txIndex / 3);
            const col = txIndex % 3;
            
            if (!batchBlockRef.current) continue;
            
            const blockPos = batchBlockRef.current.position;
            finalPositions.push({
              x: blockPos.x - 0.5 + col * 0.5, // Position within block width
              y: blockPos.y - 0.5 + row * 0.4, // Position below center to ensure inside
              z: blockPos.z // Centered on z-axis
            });
          }
          
          // Update transactions processed count
          transactionsProcessed += batch.length;
          
          // Stagger the movement of transactions
          for (let txIndex = 0; txIndex < batch.length; txIndex++) {
            const tx = batch[txIndex];
            
            // Create a promise for this transaction's animation
            const animationPromise = (async () => {
              // Small delay based on index for staggered effect
              await new Promise(resolve => setTimeout(resolve, txIndex * 50));
              
              // Get position along the path
              const getPathPosition = (progress) => {
                // Sample the path at the given progress (0-1)
                const point = pathGeo.parameters.path.getPointAt(progress);
                
                return {
                  x: point.x,
                  y: point.y,
                  z: point.z
                };
              };
              
              // Animate along the path
              const startTime = Date.now();
              const duration = 1000; // Slower for more clarity
              
              await new Promise(resolve => {
                function update() {
                  const elapsed = Date.now() - startTime;
                  const progress = Math.min(elapsed / duration, 1);
                  
                  // Get position along the path
                  if (progress < 0.7) {
                    // First 70% of animation follows the path
                    const pathProgress = progress / 0.7;
                    const pathPos = getPathPosition(pathProgress);
                    tx.position.set(pathPos.x, pathPos.y, pathPos.z);
                  } else {
                    // Last 30% moves to final position with easing
                    const finalProgress = (progress - 0.7) / 0.3;
                    
                    // Use easing function for smoother entry
                    const easedProgress = 1 - Math.pow(1 - finalProgress, 3); // Cubic ease out
                    
                    const finalPos = finalPositions[txIndex];
                    const pathPos = getPathPosition(1);
                    
                    tx.position.x = pathPos.x + (finalPos.x - pathPos.x) * easedProgress;
                    tx.position.y = pathPos.y + (finalPos.y - pathPos.y) * easedProgress;
                    tx.position.z = pathPos.z + (finalPos.z - pathPos.z) * easedProgress;
                  }
                  
                  if (progress < 1) {
                    requestAnimationFrame(update);
                  } else {
                    // Add pulse highlight when transaction enters block
                    pulseHighlight(batchBlockRef.current);
                    resolve();
                  }
                }
                
                update();
              });
            })();
            
            blockchainPromises.push(animationPromise);
          }
          
          // Wait for all transactions in this batch to move to blockchain
          await Promise.all(blockchainPromises);
          
          // Add a visual effect to show batch completion
          const completionFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.8
            })
          );
          completionFlash.position.set(
            batchBlockRef.current.position.x,
            batchBlockRef.current.position.y + 1,
            batchBlockRef.current.position.z
          );
          batchSceneRef.current.add(completionFlash);
          
          // Animate the flash effect
          const animateFlash = () => {
            return new Promise(resolve => {
              let scale = 1;
              let opacity = 0.8;
              const flashInterval = setInterval(() => {
                scale += 0.2;
                opacity -= 0.1;
                completionFlash.scale.set(scale, scale, scale);
                completionFlash.material.opacity = opacity;
                
                if (opacity <= 0) {
                  clearInterval(flashInterval);
                  batchSceneRef.current.remove(completionFlash);
                  resolve();
                }
              }, 50);
            });
          };
          
          // Run the flash animation
          await animateFlash();
          
          // Fade out and remove path
          const fadeOutPath = () => {
            return new Promise(resolve => {
              let opacity = pathMat.opacity;
              const fadeInterval = setInterval(() => {
                opacity -= 0.05;
                pathMat.opacity = opacity;
                
                if (opacity <= 0) {
                  clearInterval(fadeInterval);
                  batchSceneRef.current.remove(path);
                  batchSceneRef.current.remove(indicator);
                  resolve();
                }
              }, 30);
            });
          };
          
          await fadeOutPath();
          
          // Reset batch container color
          batchContainer.material.color.set(0xe2e8f0);
          batchContainer.material.emissive.set(0xf1f5f9);
          batchContainer.material.emissiveIntensity = 0.2;
          
          // Short pause between batches
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Show block is mined - focus on blockchain
      if (batchBlockRef.current) {
        await animateCamera(
          camera,
          { x: 15, y: 10, z: 10 },
          { x: 15, y: 0, z: 0 },
          1000
        );
        
        batchBlockRef.current.material.color.set(0x10b981);
      }
      
      // Zoom out to show the full scene after completion
      await animateCamera(
        camera,
        { x: 0, y: 30, z: 20 },
        { x: 0, y: 0, z: 0 },
        1500
      );
      
      // Calculate final statistics
      const endTime = performance.now();
      const totalTimeBatch = endTime - startTime;
      
      setComparisonStats(prevStats => ({
        ...prevStats,
        batch: {
          time: totalTimeBatch,
          count: transactionsProcessed
        }
      }));
      
      setExplanation(`Batch processing with EigenLayer AVS complete: ${transactionsProcessed} transactions in ${(totalTimeBatch/1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error("Batch simulation error:", error);
    }
  };
  
  // Start both simulations simultaneously
  const startComparison = async () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    setComparisonStats(null);
    
    try {
      await Promise.all([
        runBatchSimulation(),
        runIndividualSimulation()
      ]);
    } catch (error) {
      console.error("Comparison error:", error);
    } finally {
      setStep(0);
      setExplanation('Simulation complete. Click "Start Comparison" to run again.');
      setIsSimulating(false);
    }
  };
  
  // Display comparison stats if both simulations have been run
  const displayComparisonStats = () => {
    if (!comparisonStats || !comparisonStats.batch || !comparisonStats.individual) {
      return null;
    }
    
    const batchTime = comparisonStats.batch.time / 1000;
    const individualTime = comparisonStats.individual.time / 1000;
    const efficiency = ((individualTime - batchTime) / individualTime * 100).toFixed(1);

    return (
      <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg mt-4">
        <h3 className="font-bold text-purple-300 mb-2">Performance Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 p-3 rounded shadow-sm">
            <div className="text-sm text-zinc-400">Individual Processing</div>
            <div className="text-lg font-bold text-white">{individualTime.toFixed(1)}s</div>
            <div className="text-xs text-zinc-500">{comparisonStats.individual.count} transactions</div>
          </div>
          <div className="bg-zinc-900 p-3 rounded shadow-sm">
            <div className="text-sm text-zinc-400">Batch Processing (EigenLayer AVS)</div>
            <div className="text-lg font-bold text-purple-400">{batchTime.toFixed(1)}s</div>
            <div className="text-xs text-zinc-500">{comparisonStats.batch.count} transactions</div>
          </div>
        </div>
        <div className="mt-3 text-center bg-purple-900/30 p-2 rounded">
          <span className="font-bold text-purple-300">
            EigenLayer AVS batching is {efficiency}% faster!
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full mt-auto bg-zinc-900 text-white rounded-lg overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-xl font-bold">Ethereum Transaction Processing Comparison</h2>
        <p className="text-zinc-400 mt-2">
          Comparison of traditional fee-based sequential processing vs. EigenLayer AVS state-based batching for optimized throughput.
        </p>
      </div>
      
      <div className="flex items-center justify-between p-4 bg-zinc-800">
        <div className="text-sm md:text-base text-zinc-300">
          {explanation}
        </div>
        <button 
          onClick={startComparison}
          disabled={isSimulating}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded disabled:opacity-50"
          aria-label="Start comparison"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              startComparison();
            }
          }}
        >
          {isSimulating ? 'Simulating...' : 'Start Comparison'}
        </button>
      </div>
      
      <div className="flex flex-col w-full" style={{ background: '#09090b' }}>
        <div className="w-full h-[275px] relative border-b border-zinc-800">
          <div className="absolute top-2 left-2 bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-sm font-medium z-10">
            Batch Processing
          </div>
          <div ref={batchMountRef} className="w-full h-full" />
        </div>
        <div className="w-full h-[275px] relative">
          <div className="absolute top-2 left-2 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm font-medium z-10">
            Individual Processing
          </div>
          <div ref={individualMountRef} className="w-full h-full" />
        </div>
      </div>
      
      {displayComparisonStats()}
      
      <div className="p-4 bg-zinc-800 text-sm">
        <h3 className="font-bold mb-2 text-white">Key Concepts:</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <li className="flex items-center">
            <div className="w-4 h-4 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-zinc-300">Transactions in mempool</span>
          </li>
          <li className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span className="text-zinc-300">State 0 transactions</span>
          </li>
          <li className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-zinc-300">State 2 transactions</span>
          </li>
          <li className="flex items-center">
            <div className="w-4 h-4 bg-purple-500 rounded-full mr-2"></div>
            <span className="text-zinc-300">State 4 transactions</span>
          </li>
          <li className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <span className="text-zinc-300">State 3 transactions</span>
          </li>
          <li className="flex items-center">
            <div className="w-4 h-4 bg-zinc-400 rounded-full mr-2"></div>
            <span className="text-zinc-300">Blockchain blocks</span>
          </li>
          <li className="flex items-center">
            <div className="flex items-center h-4 bg-gradient-to-r from-green-400 to-purple-500 w-4 rounded-full mr-2"></div>
            <span className="text-zinc-300">Transaction fee (height = fee size)</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default EthereumTransactionBatching;