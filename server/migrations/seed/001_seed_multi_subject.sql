INSERT INTO public.knowledge_points (id, subject, title, content)
VALUES
    (101, 'math', '有理数运算', '掌握有理数加减乘除与符号规则。'),
    (102, 'math', '一元一次方程', '理解移项与等式性质，完成一元一次方程求解。'),
    (103, 'math', '整式运算', '完成整式加减与同类项合并。'),
    (104, 'math', '因式分解', '掌握提公因式与公式法分解。'),
    (105, 'math', '函数基础', '理解函数对应关系与图像基础。'),
    (106, 'math', '二次函数', '掌握二次函数图像、顶点与应用。'),
    (201, 'physics', '速度与位移', '理解速度、位移与时间关系。'),
    (202, 'physics', '牛顿第二定律', '掌握 F=ma 的计算与分析。'),
    (203, 'physics', '功和功率', '理解功、功率与效率的计算。'),
    (204, 'physics', '动能定理', '掌握动能变化与外力做功关系。'),
    (205, 'physics', '电流与电压', '理解欧姆定律和串并联基础。'),
    (206, 'physics', '电功率', '掌握电功率、电能与安全应用。')
ON CONFLICT (id) DO UPDATE SET
    subject = EXCLUDED.subject,
    title = EXCLUDED.title,
    content = EXCLUDED.content;

INSERT INTO public.knowledge_dependencies (knowledge_id, prerequisite_id)
VALUES
    (102, 101),
    (103, 102),
    (104, 103),
    (105, 102),
    (106, 104),
    (106, 105),
    (202, 201),
    (203, 202),
    (204, 203),
    (205, 201),
    (206, 205),
    (206, 203)
ON CONFLICT (knowledge_id, prerequisite_id) DO NOTHING;

INSERT INTO public.questions (id, knowledge_point_id, difficulty, content)
VALUES
    (1001, 101, 0.2, '{"question":"计算：-3 + 7 = ?","options":["2","4","10","-10"],"answer":"4","explanation":"异号相加取绝对值差，符号取绝对值大的数。"}'),
    (1002, 101, 0.3, '{"question":"计算：(-2)×(-5) = ?","options":["-10","10","7","-7"],"answer":"10","explanation":"负负得正。"}'),
    (1003, 102, 0.3, '{"question":"解方程：2x+3=11","options":["x=3","x=4","x=5","x=6"],"answer":"x=4","explanation":"移项得 2x=8。"}'),
    (1004, 102, 0.4, '{"question":"解方程：5x-2=3x+6","options":["x=2","x=3","x=4","x=1"],"answer":"x=4","explanation":"移项得 2x=8。"}'),
    (1005, 103, 0.5, '{"question":"化简：3a+2b-a+b","options":["2a+3b","4a+3b","2a+b","a+3b"],"answer":"2a+3b","explanation":"同类项分别合并。"}'),
    (1006, 103, 0.5, '{"question":"化简：2x-(3x-4)","options":["-x+4","x-4","-x-4","5x-4"],"answer":"-x+4","explanation":"先去括号。"}'),
    (1007, 104, 0.6, '{"question":"分解：x^2-9","options":["(x-3)^2","(x-3)(x+3)","(x+9)(x-1)","x(x-9)"],"answer":"(x-3)(x+3)","explanation":"平方差公式。"}'),
    (1008, 104, 0.7, '{"question":"分解：2x^2+4x","options":["2x(x+2)","x(2x+4)","2(x^2+2x)","以上都可"],"answer":"以上都可","explanation":"可提公因式，多种等价写法。"}'),
    (1009, 105, 0.6, '{"question":"函数 y=2x+1 中 x=3 时 y=?","options":["6","7","8","9"],"answer":"7","explanation":"代入 x=3。"}'),
    (1010, 105, 0.7, '{"question":"下列对应关系中属于函数的是？","options":["每人对应多个学号","每人对应唯一学号","一个学号对应多人","以上都不是"],"answer":"每人对应唯一学号","explanation":"自变量对应唯一因变量。"}'),
    (1011, 106, 0.8, '{"question":"抛物线 y=x^2-4x+3 顶点横坐标为？","options":["-2","2","4","1"],"answer":"2","explanation":"-b/2a=2。"}'),
    (1012, 106, 0.9, '{"question":"二次函数 y=-x^2+2x 开口方向？","options":["向上","向下","左右","无法判断"],"answer":"向下","explanation":"a<0 向下开口。"}'),
    (2001, 201, 0.2, '{"question":"v=s/t 中 s=20m,t=4s，v=?","options":["4","5","6","8"],"answer":"5","explanation":"直接代入。"}'),
    (2002, 201, 0.3, '{"question":"位移-时间图像斜率表示？","options":["位移","速度","加速度","功率"],"answer":"速度","explanation":"斜率=速度。"}'),
    (2003, 202, 0.4, '{"question":"质量2kg物体受力6N，加速度为？","options":["2","3","4","6"],"answer":"3","explanation":"a=F/m。"}'),
    (2004, 202, 0.5, '{"question":"F=ma 中 m 不变，F增大，a如何变化？","options":["减小","不变","增大","先增后减"],"answer":"增大","explanation":"正比例关系。"}'),
    (2005, 203, 0.5, '{"question":"功的单位是？","options":["N","W","J","Pa"],"answer":"J","explanation":"焦耳。"}'),
    (2006, 203, 0.6, '{"question":"10s 做功100J，功率为？","options":["5W","10W","20W","100W"],"answer":"10W","explanation":"P=W/t。"}'),
    (2007, 204, 0.7, '{"question":"动能表达式是？","options":["mv","1/2mv","1/2mv^2","mv^2"],"answer":"1/2mv^2","explanation":"标准公式。"}'),
    (2008, 204, 0.8, '{"question":"外力做正功时，动能通常？","options":["减小","不变","增大","变号"],"answer":"增大","explanation":"动能定理。"}'),
    (2009, 205, 0.5, '{"question":"欧姆定律表达式？","options":["U=IR","P=UI","W=Pt","Q=cm△t"],"answer":"U=IR","explanation":"电路基础。"}'),
    (2010, 205, 0.6, '{"question":"串联电路中电流特点？","options":["各处相等","两端最大","只在电源处有","与电压成反比"],"answer":"各处相等","explanation":"串联电流处处相等。"}'),
    (2011, 206, 0.8, '{"question":"电功率单位是？","options":["A","V","W","J"],"answer":"W","explanation":"瓦特。"}'),
    (2012, 206, 0.9, '{"question":"P=UI 中 U=220V,I=2A，P=?","options":["110W","220W","440W","880W"],"answer":"440W","explanation":"乘法计算。"}')
ON CONFLICT (id) DO UPDATE SET
    knowledge_point_id = EXCLUDED.knowledge_point_id,
    difficulty = EXCLUDED.difficulty,
    content = EXCLUDED.content;

SELECT setval('public.knowledge_points_id_seq', GREATEST((SELECT MAX(id) FROM public.knowledge_points), 1));
SELECT setval('public.questions_id_seq', GREATEST((SELECT MAX(id) FROM public.questions), 1));
