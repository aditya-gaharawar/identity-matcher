"use client";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import { WalletConnect } from "@/components/walletConnect";
import { useAccount, useSwitchChain, useChainId } from "wagmi";
import { filecoinCalibration } from "wagmi/chains";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { IDENTITY_CONTRACT_ABI, IDENTITY_CONTRACT_ADDRESS } from "@/lib/contract";
import { useEthersProvider, useEthersSigner } from "@/hooks/useEthers";
import { supabase, ReferenceImage } from "@/lib/supabase";


export default function AdminPanel() {
    const { isConnected, address } = useAccount();
    const connectedChainId = useChainId();
    const { switchChain, isPending: isSwitching } = useSwitchChain();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<Array<{fileName: string; profileId: number; data: {Hash: string}}>>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isStoring, setIsStoring] = useState(false);
    const [storeError, setStoreError] = useState<string | null>(null);
    const [storeSuccess, setStoreSuccess] = useState(false);
    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
    

    const isMatching = connectedChainId === filecoinCalibration.id;
    const signer = useEthersSigner();

    const LIGHTHOUSE_API_KEY = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY;

    // Load reference images from Supabase
    useEffect(() => {
        loadReferenceImages();
    }, []);

    const loadReferenceImages = async () => {
        try {
            const { data, error } = await supabase
                .from('reference_images')
                .select('*')
                .order('profile_id', { ascending: true });
            
            if (error) throw error;
            setReferenceImages(data || []);
        } catch (error) {
            console.error('Error loading reference images:', error);
        }
    };

    // Switch to Filecoin Calibration
    useEffect(() => {
        if (isConnected && !isMatching) {
            switchChain({ chainId: filecoinCalibration.id });
        }
    }, [isConnected, isMatching, switchChain]);

    const progressCallback = (progressData: any) => {
        try {
            const pct = 100 - Number(((progressData?.total / progressData?.uploaded) as number).toFixed(2));
            if (!Number.isNaN(pct)) setUploadProgress(pct);
        } catch {}
    };

    const onUploadChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!LIGHTHOUSE_API_KEY) {
            setUploadError("Lighthouse API key not configured");
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(0);

        try {
            const { default: lighthouse } = await import("@lighthouse-web3/sdk");
            
            const uploadPromises = Array.from(files).map(async (file) => {
                const output = await lighthouse.upload(
                    [file],
                    LIGHTHOUSE_API_KEY,
                    undefined,
                    progressCallback
                );
                return {
                    ...output,
                    fileName: file.name,
                    profileId: selectedProfileId
                };
            });

            const results = await Promise.all(uploadPromises);
            setUploadedFiles(results);
            setUploadProgress(100);
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleStoreOnContract = useCallback(async () => {
        if (!isConnected || !isMatching || uploadedFiles.length === 0) return;

        try {
            setIsStoring(true);
            setStoreError(null);
            setStoreSuccess(false);

            if (!signer) {
                throw new Error("Please connect your wallet");
            }

            // Store all uploaded files CIDs on the contract
            for (const file of uploadedFiles) {
                const { error } = await supabase
                    .from('reference_images')
                    .insert({
                        profile_id: file.profileId,
                        image_cid: file.data.Hash,
                        image_url: `https://gateway.lighthouse.storage/ipfs/${file.data.Hash}`
                    });

                if (error) throw error;
            }

            setStoreSuccess(true);
            await loadReferenceImages(); // Refresh the list
            setUploadedFiles([]); // Clear uploaded files
        } catch (e) {
            const err = e as unknown as { reason?: string; shortMessage?: string; message?: string };
            const reason = err?.reason || err?.shortMessage || err?.message || "Store transaction failed";
            setStoreError(reason);
        } finally {
            setIsStoring(false);
        }
    }, [isConnected, isMatching, signer, uploadedFiles]);

    return (
        <div className="min-h-screen bg-white-pattern">
            <section className="min-h-screen flex flex-col justify-between pb-10 md:pb-20">
                <div className="flex justify-between items-center pt-20 md:pt-32 container mx-auto px-4 md:px-16">
                    <Link href="/">
                        <Image
                            className="cursor-pointer"
                            src="https://code.webspaceai.in/lovable-uploads/b5556be9-1da8-4fdb-a6b9-969b73491798.png"
                            width={150}
                            height={150}
                            alt="Identity Matcher Logo"
                        />
                    </Link>
                    <div className="flex items-center">
                        {!isConnected ? (
                            <WalletConnect />
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span className="font-funnel-display text-xl text-gray-600">
                                    Admin: {address?.slice(0, 6)}...{address?.slice(-4)} 👋
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {isConnected && (
                    <div className="flex-1 container mx-auto px-4 md:px-16">
                        <div className="space-y-8">
                            {/* Header */}
                            <div>
                                <h1 className="font-funnel-display text-3xl font-bold text-black mb-4">
                                    Admin Panel - Reference Images
                                </h1>
                                <p className="font-funnel-display text-lg text-gray-600">
                                    Upload and manage reference images for identity verification
                                </p>
                            </div>

                            {isConnected && !isMatching && (
                                <div className="w-full max-w-md p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-yellow-800 font-funnel-display">
                                            Please switch to Filecoin Calibration network
                                        </p>
                                        <button
                                            onClick={() => switchChain({ chainId: filecoinCalibration.id })}
                                            disabled={isSwitching}
                                            className={`ml-3 px-3 py-1.5 rounded-md text-sm font-funnel-display font-semibold transition-colors ${
                                                isSwitching ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                            }`}
                                        >
                                            {isSwitching ? 'Switching...' : 'Switch Network'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Upload Section */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Profile ID
                                    </label>
                                    <select
                                        value={selectedProfileId}
                                        onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {[1, 2, 3, 4, 5].map(id => (
                                            <option key={id} value={id}>Profile {id}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        id="file-upload"
                                        onChange={(e) => onUploadChange(e.target.files)}
                                        disabled={isUploading}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`flex flex-col items-center justify-center w-96 h-64 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                                            isUploading 
                                                ? 'border-blue-400 bg-blue-50' 
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center space-y-3">
                                            {isUploading ? (
                                                <div className="flex flex-col items-center space-y-2">
                                                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                                    <p className="text-sm text-blue-600 font-funnel-display">
                                                        Uploading... {uploadProgress.toFixed(0)}%
                                                    </p>
                                                </div>
                                            ) : uploadedFiles.length > 0 ? (
                                                <div className="flex flex-col items-center space-y-2">
                                                    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <p className="text-sm text-green-600 font-funnel-display">
                                                        {uploadedFiles.length} files uploaded successfully!
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <svg
                                                        className="w-12 h-12 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={1.5}
                                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                        />
                                                    </svg>
                                                    <div className="text-center">
                                                        <p className="text-lg font-semibold text-gray-700 font-funnel-display">
                                                            Upload reference images
                                                        </p>
                                                        <p className="text-sm text-gray-500 font-funnel-display">
                                                            Drag and drop or click to browse
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {uploadError && (
                                    <p className="text-sm text-red-600 font-funnel-display">
                                        {uploadError}
                                    </p>
                                )}

                                {uploadedFiles.length > 0 && (
                                    <button
                                        onClick={handleStoreOnContract}
                                        disabled={isStoring || !isConnected || !isMatching}
                                        className={`px-6 py-3 rounded-lg font-funnel-display font-semibold transition-colors ${
                                            isStoring || !isConnected || !isMatching
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {isStoring ? 'Storing...' : 'Store Reference Images'}
                                    </button>
                                )}

                                {storeError && (
                                    <p className="text-sm text-red-600 font-funnel-display">
                                        {storeError}
                                    </p>
                                )}

                                {storeSuccess && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-800 font-funnel-display">
                                            ✅ Reference images stored successfully!
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Reference Images List */}
                            <div className="space-y-4">
                                <h2 className="font-funnel-display text-2xl font-bold text-black">
                                    Existing Reference Images
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {referenceImages.map((img) => (
                                        <div key={img.id} className="border rounded-lg p-4 space-y-2">
                                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                                <Image
                                                    src={img.image_url}
                                                    alt={`Profile ${img.profile_id}`}
                                                    width={200}
                                                    height={200}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-funnel-display font-medium">Profile {img.profile_id}</p>
                                                <p className="text-xs text-gray-500 font-funnel-display">
                                                    CID: {img.image_cid.slice(0, 10)}...
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <Footer />
        </div>
    );
}
