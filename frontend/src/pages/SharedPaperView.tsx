import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Clock, Play, Download, Share2, AlertTriangle, FileX, Copy, Check, MessageCircle, User } from "lucide-react";
import MathQuestion from "../components/MathQuestion";
import { getSharedPaper, generatePdf, markSharedPaperAttemptStarted, type SharedPaper, type GeneratedBlock, type PaperConfig } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function SharedPaperView() {
  const [, params] = useRoute("/paper/shared/:code");
  const code = params?.code?.toUpperCase().trim() || "";
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [showAnswers, setShowAnswers] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: paper, isLoading, error, isError } = useQuery<SharedPaper>({
    queryKey: ["shared-paper", code],
    queryFn: () => getSharedPaper(code),
    enabled: code.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!paper) return;
    const tick = () => {
      const now = Date.now();
      const exp = new Date(paper.expires_at).getTime();
      const diff = exp - now;
      if (diff <= 0) { setTimeLeft("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [paper]);

  const shareLink = `${window.location.origin}/paper/shared/${code}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!paper) return;
    const msg = `Hey! Try this math paper "${paper.paper_title}" (${paper.total_questions} questions). Open this link to attempt it:\n${shareLink}\n\nCode: ${paper.code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleAttemptPaper = () => {
    if (!paper) return;
    if (!isAuthenticated) {
      sessionStorage.setItem("postLoginRedirect", `/paper/shared/${code}`);
      setLocation("/login");
      return;
    }
    const paperData = {
      config: {
        level: (paper.paper_level || "Custom") as PaperConfig["level"],
        title: paper.paper_title || "Shared Paper",
        totalQuestions: String(paper.total_questions) as PaperConfig["totalQuestions"],
        blocks: paper.paper_config.blocks || [],
        orientation: "portrait" as const,
      },
      blocks: paper.generated_blocks,
      seed: paper.seed,
    };
    try {
      sessionStorage.setItem("paperAttemptData", JSON.stringify(paperData));
      markSharedPaperAttemptStarted(code).catch(() => {});
      setLocation("/paper/attempt");
    } catch {
      alert("Failed to prepare paper. Please try again.");
    }
  };

  const handleDownloadPdf = async (withAnswers: boolean) => {
    if (!paper) return;
    setDownloading(true);
    try {
      const config: PaperConfig = {
        level: (paper.paper_level || "Custom") as PaperConfig["level"],
        title: paper.paper_title || "Shared Paper",
        totalQuestions: String(paper.total_questions) as PaperConfig["totalQuestions"],
        blocks: paper.paper_config.blocks || [],
        orientation: "portrait",
      };
      const blob = await generatePdf(config, withAnswers, paper.seed, paper.generated_blocks);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${paper.paper_title || "paper"}${withAnswers ? "_with_answers" : ""}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Block rendering helper (same pattern as PaperCreate) ──
  const isHorizontalBlockType = (type: string): boolean => {
    return type === "multiplication" || type === "decimal_multiplication" ||
           type === "division" || type === "decimal_division" ||
           type === "lcm" || type === "gcd" ||
           type === "square_root" || type === "cube_root" || type === "percentage";
  };

  const renderBlocks = (blocks: GeneratedBlock[]) => {
    const groupedBlocks: Array<{ blocks: GeneratedBlock[]; indices: number[] }> = [];
    let currentGroup: GeneratedBlock[] = [];
    let currentIndices: number[] = [];
    blocks.forEach((block, i) => {
      const isH = isHorizontalBlockType(block.config.type);
      const nextH = blocks[i + 1] && isHorizontalBlockType(blocks[i + 1].config.type);
      if (isH) {
        currentGroup.push(block);
        currentIndices.push(i);
        if (!nextH) {
          groupedBlocks.push({ blocks: currentGroup, indices: currentIndices });
          currentGroup = [];
          currentIndices = [];
        }
      } else {
        if (currentGroup.length > 0) {
          groupedBlocks.push({ blocks: currentGroup, indices: currentIndices });
          currentGroup = [];
          currentIndices = [];
        }
        groupedBlocks.push({ blocks: [block], indices: [i] });
      }
    });
    if (currentGroup.length > 0) groupedBlocks.push({ blocks: currentGroup, indices: currentIndices });

    return groupedBlocks.map((group, gi) => {
      const isHG = group.blocks.length >= 2 && group.blocks.every((b) => isHorizontalBlockType(b.config.type));
      if (isHG) {
        const sets: Array<{ blocks: GeneratedBlock[]; indices: number[] }> = [];
        for (let i = 0; i < group.blocks.length; i += 3)
          sets.push({ blocks: group.blocks.slice(i, i + 3), indices: group.indices.slice(i, i + 3) });
        return (
          <div key={gi} className="space-y-4">
            {sets.map((s, si) => (
              <div key={si} className="flex flex-row gap-3 w-full">
                {s.blocks.map((block, bi) => {
                  const oi = s.indices[bi];
                  return (
                    <div key={oi} style={{flex:1,background:'#141729',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:'16px 18px',minWidth:0}}>
                      <h3 style={{fontWeight:800,fontSize:15,marginBottom:12,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif"}}>{block.config.title || `Section ${oi+1}`}</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {block.questions.map((q) => (
                          <MathQuestion key={q.id} question={q} showAnswer={showAnswers} smallHorizontalFont={!q.isVertical} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Array.from({ length: 3 - s.blocks.length }).map((_, idx) => (
                  <div key={`e-${idx}`} style={{flex:1,background:'rgba(15,17,32,0.5)',borderRadius:16,border:'1px solid rgba(255,255,255,0.05)'}} />
                ))}
              </div>
            ))}
          </div>
        );
      } else {
        return group.blocks.map((block, bi) => {
          const oi = group.indices[bi];
          const hasVert = block.questions.some((q) => q.isVertical);
          const isVert = hasVert && ["addition","subtraction","add_sub","integer_add_sub","direct_add_sub","small_friends_add_sub","big_friends_add_sub","mix_friends_add_sub"].includes(block.config.type);
          return (
            <div key={oi} style={{background:'#141729',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:'16px 18px',marginBottom:12}}>
              <h3 style={{fontWeight:800,fontSize:15,marginBottom:12,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif"}}>{block.config.title || `Section ${oi+1}`}</h3>
              {isVert ? (
                <div className="overflow-x-auto scrollbar-premium">
                  {(() => {
                    const perRow = 10;
                    const rows: (typeof block.questions)[] = [];
                    for (let i = 0; i < block.questions.length; i += perRow) rows.push(block.questions.slice(i, i + perRow));
                    return rows.map((qRow, ri) => {
                      const maxOps = Math.max(...qRow.map((q) => q.operands.length));
                      const trs: JSX.Element[] = [];
                      trs.push(
                        <tr key={`sno-${ri}`}>
                          {qRow.map((q) => (
                            <td key={`sno-${q.id}`} style={{padding:'4px 6px',textAlign:'center',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(123,92,229,0.12)',width:'10%'}}>
                              <span style={{fontWeight:700,fontSize:13,color:'#C4ADFF',fontFamily:'JetBrains Mono,monospace'}}>{q.id}.</span>
                            </td>
                          ))}
                          {Array.from({ length: Math.max(0, perRow - qRow.length) }).map((_, idx) => (
                            <td key={`es-${idx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}} />
                          ))}
                        </tr>
                      );
                      for (let r = 0; r < maxOps; r++) {
                        trs.push(
                          <tr key={`op-${ri}-${r}`}>
                            {qRow.map((q) => {
                              const op = q.operands[r];
                              if (op === undefined) return <td key={`e-${q.id}-${r}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.08)',background:'#141729',width:'10%'}} />;
                              let operator: string | null = null;
                              if (q.operators && q.operators.length > 0 && r > 0) operator = q.operators[r - 1];
                              else if (!q.operators) {
                                if (q.operator === "-" && r > 0) operator = q.operator;
                                else if (q.operator !== "-" && r === q.operands.length - 1) operator = q.operator;
                              }
                              return (
                                <td key={`${q.id}-${r}`} className="p-1 border border-slate-600 bg-slate-700/50 text-center" style={{width:'10%'}}>
                                  <div className="font-mono text-sm font-semibold text-white leading-tight text-center">
                                    {operator && <span className="mr-1 text-blue-400">{operator}</span>}
                                    {op}
                                  </div>
                                </td>
                              );
                            })}
                            {Array.from({ length: Math.max(0, perRow - qRow.length) }).map((_, idx) => (
                              <td key={`eo-${idx}-${r}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}} />
                            ))}
                          </tr>
                        );
                      }
                      trs.push(
                        <tr key={`line-${ri}`}>
                          {qRow.map((q) => (
                            <td key={`l-${q.id}`} style={{padding:'2px 6px',border:'1px solid rgba(255,255,255,0.08)',background:'#141729',width:'10%'}}>
                              <div style={{borderTop:'1px solid rgba(123,92,229,0.5)',width:'100%'}} />
                            </td>
                          ))}
                          {Array.from({ length: Math.max(0, perRow - qRow.length) }).map((_, idx) => (
                            <td key={`el-${idx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}} />
                          ))}
                        </tr>
                      );
                      trs.push(
                        <tr key={`ans-${ri}`}>
                          {qRow.map((q) => (
                            <td key={`a-${q.id}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(16,185,129,0.06)',textAlign:'center',width:'10%',minHeight:'1.2rem'}}>
                              <div style={{minHeight:'1.2rem',textAlign:'center'}}>
                                {showAnswers && <div style={{color:'#10B981',fontFamily:'JetBrains Mono,monospace',fontSize:12,fontWeight:700}}>{q.answer}</div>}
                              </div>
                            </td>
                          ))}
                          {Array.from({ length: Math.max(0, perRow - qRow.length) }).map((_, idx) => (
                            <td key={`ea-${idx}`} style={{padding:'4px 6px',border:'1px solid rgba(255,255,255,0.05)',background:'rgba(20,23,41,0.4)',width:'10%'}} />
                          ))}
                        </tr>
                      );
                      return <table key={`t-${ri}`} style={{width:'100%',borderCollapse:'collapse',marginBottom:16,tableLayout:'fixed'}}><tbody>{trs}</tbody></table>;
                    });
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-w-md">
                  {block.questions.map((q) => (
                    <MathQuestion key={q.id} question={q} showAnswer={showAnswers} smallHorizontalFont={!q.isVertical} />
                  ))}
                </div>
              )}
            </div>
          );
        });
      }
    });
  };

  // ── Error state: expired ──
  const isExpired = isError && (error as any)?.message?.toLowerCase().includes("expired");
  const isNotFound = isError && !isExpired;

  // ── Loading ──
  if (isLoading || authLoading) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#07070F'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:48,height:48,border:'3px solid #7B5CE5',borderTopColor:'transparent',borderRadius:'50%',animation:'sp-spin 0.9s linear infinite',margin:'0 auto 20px'}} />
          <p style={{color:'#525870',fontFamily:'DM Sans,sans-serif',fontSize:14}}>Loading shared paper...</p>
          <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Expired ──
  if (isExpired) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#07070F',padding:20}}>
        <div style={{textAlign:'center',maxWidth:420}}>
          <div style={{width:72,height:72,borderRadius:20,background:'rgba(239,68,68,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <Clock style={{width:36,height:36,color:'#EF4444'}} />
          </div>
          <h2 style={{fontSize:24,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif",marginBottom:8}}>Paper Expired</h2>
          <p style={{color:'#525870',fontFamily:'DM Sans,sans-serif',fontSize:14,lineHeight:1.6,marginBottom:24}}>
            This shared paper has expired. Shared papers are available for 24 hours after creation. Ask the sender to share a new one!
          </p>
          <button onClick={() => setLocation("/")} style={{padding:'12px 28px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',borderRadius:12,border:'none',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (isNotFound || !paper) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#07070F',padding:20}}>
        <div style={{textAlign:'center',maxWidth:420}}>
          <div style={{width:72,height:72,borderRadius:20,background:'rgba(239,68,68,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <FileX style={{width:36,height:36,color:'#EF4444'}} />
          </div>
          <h2 style={{fontSize:24,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif",marginBottom:8}}>Paper Not Found</h2>
          <p style={{color:'#525870',fontFamily:'DM Sans,sans-serif',fontSize:14,lineHeight:1.6,marginBottom:24}}>
            We couldn't find a shared paper with code <span style={{fontFamily:'JetBrains Mono,monospace',color:'#9D7FF0',fontWeight:700}}>{code}</span>. Check the code and try again.
          </p>
          <button onClick={() => setLocation("/")} style={{padding:'12px 28px',background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',borderRadius:12,border:'none',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:'pointer'}}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div style={{minHeight:'100vh',background:'#07070F',padding:'24px 16px 80px'}}>
      <div style={{maxWidth:900,margin:'0 auto'}}>

        {/* ── Hero card ── */}
        <div style={{background:'#0F1120',borderRadius:20,border:'1px solid rgba(59,130,246,0.2)',overflow:'hidden',marginBottom:24}}>
          <div style={{height:3,background:'linear-gradient(90deg,#3B82F6,#7B5CE5,#EC4899)'}} />
          <div style={{padding:'24px 24px 20px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <Share2 style={{width:16,height:16,color:'#3B82F6'}} />
                  <span style={{fontSize:11,fontWeight:700,color:'#3B82F6',fontFamily:'DM Sans,sans-serif',textTransform:'uppercase',letterSpacing:'0.08em'}}>Shared Paper</span>
                </div>
                <h1 style={{fontSize:'clamp(22px,4vw,28px)',fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif",margin:'0 0 6px'}}>
                  {paper.paper_title}
                </h1>
                <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  {paper.created_by_name && (
                    <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#525870',fontFamily:'DM Sans,sans-serif'}}>
                      <User style={{width:12,height:12}} /> Shared by {paper.created_by_name}
                    </span>
                  )}
                  <span style={{fontSize:12,color:'#525870',fontFamily:'DM Sans,sans-serif'}}>•</span>
                  <span style={{fontSize:12,color:'#525870',fontFamily:'DM Sans,sans-serif'}}>{paper.paper_level}</span>
                </div>
              </div>
              {/* Code badge */}
              <div style={{textAlign:'center'}}>
                <p style={{margin:'0 0 4px',fontSize:10,color:'#525870',fontFamily:'DM Sans,sans-serif',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Code</p>
                <div style={{padding:'8px 20px',background:'rgba(59,130,246,0.1)',border:'1.5px solid rgba(59,130,246,0.3)',borderRadius:10}}>
                  <span style={{fontSize:20,fontWeight:900,fontFamily:'JetBrains Mono,monospace',color:'#60A5FA',letterSpacing:'0.2em'}}>{paper.code}</span>
                </div>
              </div>
            </div>

            {/* Stat chips */}
            <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(123,92,229,0.08)',border:'1px solid rgba(123,92,229,0.2)',borderRadius:8}}>
                <span style={{fontSize:11,color:'#9D7FF0',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>{paper.total_questions} questions</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:timeLeft === 'Expired' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',border:`1px solid ${timeLeft === 'Expired' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,borderRadius:8}}>
                <Clock style={{width:12,height:12,color:timeLeft === 'Expired' ? '#EF4444' : '#10B981'}} />
                <span style={{fontSize:11,color:timeLeft === 'Expired' ? '#EF4444' : '#10B981',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>{timeLeft || '...'}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8}}>
                <Eye style={{width:12,height:12,color:'#525870'}} />
                <span style={{fontSize:11,color:'#525870',fontFamily:'DM Sans,sans-serif',fontWeight:600}}>{paper.view_count} views</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
          <button
            onClick={handleAttemptPaper}
            disabled={timeLeft === 'Expired'}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',background:timeLeft === 'Expired' ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#EF4444,#DC2626)',borderRadius:14,border:'none',color:timeLeft === 'Expired' ? '#525870' : 'white',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:timeLeft === 'Expired' ? 'not-allowed' : 'pointer',boxShadow:timeLeft === 'Expired' ? 'none' : '0 4px 16px rgba(239,68,68,0.35)',transition:'all 0.2s'}}
          >
            <Play style={{width:16,height:16}} />
            {isAuthenticated ? 'Attempt Paper' : 'Sign in to Attempt'}
          </button>
          <button
            onClick={() => handleDownloadPdf(false)}
            disabled={downloading || timeLeft === 'Expired'}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',background:timeLeft === 'Expired' ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#7B5CE5,#9D7FF0)',borderRadius:14,border:'none',color:timeLeft === 'Expired' ? '#525870' : 'white',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:14,cursor:timeLeft === 'Expired' ? 'not-allowed' : 'pointer',boxShadow:timeLeft === 'Expired' ? 'none' : '0 4px 16px rgba(123,92,229,0.35)',transition:'all 0.2s'}}
          >
            <Download style={{width:16,height:16}} />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>

        {/* ── Share bar ── */}
        <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
          <button onClick={handleCopyLink} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:10,color:'#60A5FA',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:12,cursor:'pointer'}}>
            {copiedLink ? <Check style={{width:13,height:13}} /> : <Copy style={{width:13,height:13}} />}
            {copiedLink ? 'Link Copied!' : 'Copy Link'}
          </button>
          <button onClick={handleWhatsAppShare} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.2)',borderRadius:10,color:'#25D366',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:12,cursor:'pointer'}}>
            <MessageCircle style={{width:13,height:13}} />
            Share on WhatsApp
          </button>
          <button onClick={() => setShowAnswers(!showAnswers)} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',background:showAnswers ? 'rgba(123,92,229,0.12)' : 'rgba(255,255,255,0.04)',border:`1px solid ${showAnswers ? 'rgba(123,92,229,0.3)' : 'rgba(255,255,255,0.1)'}`,borderRadius:10,color:showAnswers ? '#9D7FF0' : '#B8BDD8',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:12,cursor:'pointer',marginLeft:'auto'}}>
            {showAnswers ? <EyeOff style={{width:13,height:13}} /> : <Eye style={{width:13,height:13}} />}
            {showAnswers ? 'Hide Answers' : 'Show Answers'}
          </button>
        </div>

        {/* ── Questions ── */}
        <div style={{background:'#0F1120',borderRadius:20,border:'1px solid rgba(255,255,255,0.07)',padding:'clamp(20px,4vw,32px) clamp(16px,3vw,36px)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7B5CE5,#9D7FF0)'}} />
          <div style={{position:'relative',zIndex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
              <div style={{width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,#7B5CE5,#9D7FF0)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(123,92,229,0.4)'}}>
                <Eye style={{width:20,height:20,color:'white'}} />
              </div>
              <div>
                <h2 style={{fontSize:18,fontWeight:800,color:'#F0F2FF',fontFamily:"'Playfair Display',Georgia,serif",margin:0}}>Questions Preview</h2>
                <p style={{fontSize:12,color:'#525870',fontFamily:'DM Sans,sans-serif',margin:0,marginTop:2}}>{paper.generated_blocks.length} section{paper.generated_blocks.length !== 1 ? 's' : ''} • {paper.total_questions} questions</p>
              </div>
            </div>
            {renderBlocks(paper.generated_blocks)}
          </div>
        </div>

        {/* ── Not signed in banner ── */}
        {!isAuthenticated && (
          <div style={{marginTop:20,padding:'14px 18px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:14,display:'flex',alignItems:'center',gap:12}}>
            <AlertTriangle style={{width:18,height:18,color:'#F59E0B',flexShrink:0}} />
            <p style={{color:'#F59E0B',fontFamily:'DM Sans,sans-serif',fontSize:13,margin:0,lineHeight:1.5}}>
              Sign in to attempt this paper and track your progress. <button onClick={() => { sessionStorage.setItem("postLoginRedirect",`/paper/shared/${code}`); setLocation("/login"); }} style={{background:'none',border:'none',color:'#F59E0B',fontWeight:700,textDecoration:'underline',cursor:'pointer',fontFamily:'inherit',fontSize:'inherit',padding:0}}>Sign in now</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
