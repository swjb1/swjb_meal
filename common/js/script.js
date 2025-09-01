import { BrowserQRCodeReader } from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.0.10/+esm";

class Util{
    static request(method, url, data=null){
        return new Promise((res, rej)=>{
            let req=new XMLHttpRequest();
            req.open(method, url);
            req.addEventListener("readystatechange", e=>{
                if(req.readyState===req.DONE){
                    let json=JSON.parse(req.responseText);
                    if(req.status===200) res(json);
                    else rej(json);
                }
            })

            if(data){
                let form=new FormData();
                Object.keys(form).forEach(key=>form.append(key, form[key]));
                req.send(form);
            } else req.send();
        })
    }
}

export class Students{
    static students=[];
    static student=null;
    static participants=[];

    static sheets=[
        "1-1",
        "1-2",
        "1-3",
        "1-4",
        "1-5",
        "1-6",
        "1-7",
        "1-8",
        "2-1",
        "2-2",
        "2-3",
        "2-4",
        "2-5",
        "2-6",
        "2-7",
        "2-8",
        "3-1",
        "3-2",
        "3-3",
        "3-4",
        "3-5",
        "3-6",
        "3-7",
        "3-8"
    ]
    
    static sheetId="1D0uBz9EtXE0oRVAJwzqLqydJ9SilufUm5VaTFlNeurY";
    static key="AIzaSyB0PhMsvfQOKf4_I5Fy6qKFp5d3G2Bk4dE";
    
    static async init(){
        this.students=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values:batchGet?ranges=${this.sheets.join("&ranges=")}&key=${this.key}`).then(res=>res.json());
        
        let idx=0;
        this.students=this.students.valueRanges.reduce((acc, sheet)=>{
            let data=sheet.values.reduce((acc, value, index)=>{
                if(index===0) return acc;
                
                acc.push({
                    id: idx++,
                    grade: value[0],
                    class: value[1],
                    number: value[2],
                    name: value[3],
                    birth: value[4]
                })
                
                return acc;
            }, [])
            return [...acc, ...data];
        }, [])
        
        return this;
    }

    static validation(){
        // 1) 존재하는 학생인지
        if(!this.student){
            $("#errorAlert p").text(`학번 또는 생년월일을 확인해주세요`);
            this.error();
            return;
        }
        
        // 2) 맞는 시간에 들어온 학생인지
        if(DateUtils.compareTime()) return;
        
        // 3) 재입장하는 학생인지
        if(this.participants.find(value=>value.id===this.student.id)){
            $("#errorAlert p").text(`이미 입장한 학생입니다`);
            this.error();
            return;
        }

        this.participants.push(this.student);
        
        this.load();
        
    }

    static load(){
        setTimeout(()=>this.unload(), 2000);
        
        $($(".infoText")[0]).html(`
            <p class="mb-0 fx-8 text-muted fw-semibold text-end"><span class="mb-0 fx-8 text-dark fw-bold text-end">${this.student.grade}</span>학년</p>
            <p class="mb-0 fx-8 text-muted fw-semibold text-end"><span class="mb-0 fx-8 text-dark fw-bold text-end">${this.student.class}</span>반</p>
            <p class="mb-0 fx-8 text-muted fw-semibold text-end"><span class="mb-0 fx-8 text-dark fw-bold text-end">${this.student.number}</span>번</p>
        `)
        $($(".infoText")[1]).text(`${this.student.name}`);
        let dept=null;
        switch(this.student.class){
            case '1':
            case '2':
                dept="AI융합전자과"; break;
            case '3':
            case '4':
                dept="스마트자동화과"; break;
            case '5':
            case '6':
                dept="디자인콘텐츠과"; break;
            case '7':
            case '8':
                dept="IT소프트웨어과"; break;
        }
        $($(".infoText")[2]).text(`${dept}`);

        const gradeColor = {
            "1":   "rgba(255, 50, 70, 0.6)", 
            "2": "rgba(75, 192, 120, 0.6)", 
            "3":  "rgba(54, 162, 235, 0.6)"
        };
        
        $(".area").css("box-shadow", `0 0 1.5rem 0.5rem ${gradeColor[this.student.grade]}`)
    }
    
    static unload(){
        $(".infoTexts").html(`
            <div class="infoText ml-5 w-100 d-flex column-gap-1">
                <p class="mb-0 fx-8 text-muted fw-semibold text-end">학년</p>
                <p class="mb-0 fx-8 text-muted fw-semibold text-end">반</p>
                <p class="mb-0 fx-8 text-muted fw-semibold text-end">번</p>
            </div>

            <div>
                <p class="mb-1 fx-6 fw-semibold text-muted">이름</p>
                <p class="infoText ml-5 mb-0 fx-15 fw-bold lh-sm"></p>
            </div>

            <div>
                <p class="mb-1 fx-6 fw-semibold text-muted">학과</p>
                <p class="infoText ml-5 mb-0 fx-10 fw-bold lh-sm"></p>
            </div>
        `)
        $(".area").css("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.1)")

        this.student=null;
    }

    static error(){
        document.querySelector("#studentId").value="";
        document.querySelector("#studentBirth").value="";
        $("#errorAlert").addClass("show");

        setTimeout(()=>$("#errorAlert").removeClass("show"), 2000);

        this.student=null;
    }
}

const studentClass=await Students.init();

export class QRcode{
    constructor(){
        this.codeReader=new BrowserQRCodeReader();
        this.videoElement=document.querySelector("#video");

        this.devices=null;
        this.controls=null;
        this.cam=null;

        this.reader();
    }

    async reader(){
        this.devices=await BrowserQRCodeReader.listVideoInputDevices();
        if(!this.devices.length) return this.error();

        const common=this.devices.find(device=>device.label==="JOYTRON HD20 (145f:02aa)");
        this.cam=common ? common.deviceId : null;

        this.select();
        this.decoding();
        this.set();
    }

    select(){
        const selectElement=document.querySelector("#selectDevice select");
        const selectedDeviceId=this.cam;

        $(selectElement).html(
            this.devices.map(device =>
                `<option value="${device.deviceId}" ${device.deviceId===selectedDeviceId ? 'selected' : ''}>${device.label}</option>`
            )
        )

        $(selectElement).off("change").on("change", e=>{
            this.cam=e.target.value;
            this.decoding();
        });
    }

    decoding(){
        if(this.controls) this.controls.stop();
        const deviceId=this.cam;
        
        this.codeReader.decodeFromVideoDevice(deviceId, this.videoElement, (result, error, controls) => {
            this.controls=controls;
            if (result) {
                if(studentClass.student) return;
                
                const data=JSON.parse(result.getText());
                studentClass.student=studentClass.students.find(student=>student.grade===data.grade && student.class===data.class && student.number===data.number && student.name===data.name && student.birth===data.birth);
                studentClass.validation();

                if(studentClass.student) $(".line").addClass("success");
                else $(".line").addClass("error");
                setTimeout(()=>{
                    $(".line").removeClass("success");
                    $(".line").removeClass("error");
                }, 2000);
            }
        });
    }

    set(){
        $("#selectDevice button").on("click", e=>$("#selectDevice").addClass("d-none"));

        $(document).on("keydown", e=>{
            if(e.ctrlKey && e.key==='q'){
                e.preventDefault();
                $("#selectDevice").toggleClass("d-none");
            }
        })
    }

    error(){
        $("#cameraAlert").addClass("d-block");
        $("#cameraAlert").removeClass("d-none");

        $("#cameraAlert button").on("click", e=>{
            $("#cameraAlert").addClass("d-none");
            $("#cameraAlert").removeClass("d-block");
        })
    }
}

export class StudentNumber{
    constructor(){
        this.inputNumber=[];
        this.inputBirth=[];

        this.event();
    }

    event(){
        $("#numpad").on("click", ".key", e=>{
            const value=e.target.dataset.value;
            if(!value) return;

            if(value!=="pop" && value!=="enter"){
                if(this.inputNumber.length<4){
                    $("#studentId").addClass("focus");
                    $("#studentBirth").removeClass("focus");
                }
                else{
                    $("#studentBirth").addClass("focus");
                    $("#studentId").removeClass("focus");
                }

                if(this.inputNumber.length<5) this.inputNumber.push(Number(value));
                else this.inputBirth.push(Number(value));

                this.inputNumber=this.inputNumber.slice(0, 5);
                this.inputBirth=this.inputBirth.slice(0, 6);
            } else if(value==="pop"){
                if(this.inputNumber.length && this.inputBirth.length) this.inputBirth.pop();
                else if(this.inputNumber.length && !this.inputBirth.length) this.inputNumber.pop();

                if(this.inputNumber.length && this.inputBirth.length){
                    $("#studentBirth").addClass("focus");
                    $("#studentId").removeClass("focus");
                }
                else if(this.inputNumber.length && !this.inputBirth.length){
                    $("#studentId").addClass("focus");
                    $("#studentBirth").removeClass("focus");
                } else{
                    $("#studentId").addClass("focus");
                    $("#studentBirth").removeClass("focus");
                }
            } else if(value==="enter"){
                $("#studentId").addClass("focus");
                $("#studentBirth").removeClass("focus");

                if(studentClass.student) return;
                
                studentClass.student=studentClass.students.find(student=>`${student.grade}${student.class.padStart(2, '0')}${student.number.padStart(2, '0')}`===this.inputNumber.join("") && student.birth===this.inputBirth.join(""));

                // console.log(studentClass.student)

                this.inputNumber=[];
                this.inputBirth=[];

                studentClass.validation();
            }

            document.querySelector("#studentId").value=this.inputNumber.join("");
            document.querySelector("#studentBirth").value=this.inputBirth.join("");
        })
    }
}

export class Meal{
    constructor(){
        this.meal=[];
        this.date=null;

        this.key="22425efd9eb84d97a51875483539b6ce";

        this.init();
    }

    async init(){
        this.date=new Date();
        this.meal=await Util.request("GET", `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${this.key}&ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530899&MLSV_YMD=${this.ISOString(this.date)}&Type=json`);
        this.meal=this.meal.mealServiceDietInfo[1].row[0].DDISH_NM.split("<br/>");

        this.load();
    }

    load(){
        $("#meal").html(
            this.meal.map(value=>`
                <div class="badge rounded-pill fx-2">${value}</div>
            `)
        )
    }

    ISOString(value){
        return value.toISOString().slice(0, 10).replaceAll(/[^\d]/g, "");
    }
}

export class DateUtils{
    constructor(){
        this.load();
        this.setTime();
    }
    
    load(){
        $("header p").text(new Date().toISOString().slice(0, 10))
    }

    setTime(){
        $("#time").text(`${String(new Date().getHours()).padStart(2, "0")} : ${String(new Date().getMinutes()).padStart(2, "0")}`);
        
        setTimeout(()=>this.setTime(), 1000);
        this.isAllowed();
    }

    isAllowed(){
        if(new Date().getHours()!==13 || new Date().getMinutes()>40) return $("#entry").text(`입장 시간이 아닙니다`);

        let grades=[];
        let minute=new Date().getMinutes();
        switch(true){
            case (minute>=12):
                grades.push(1);
            case (minute>=6):
                grades.push(2);
            case (minute>=0):
                grades.push(3);
        }

        $("#entry").html(`현재 ${grades.map(grade=>`<span class="mb-0 fx-6 fw-semibold wordnormal" data-grade="${grade}">${grade}학년</span>`).join(", ")} 입장 가능합니다`);
    }

    static hoursByGrade=["12", "06", "00"];
    static compareTime(){
        const date=new Date();

        if(date.getHours()!==13 || date.getMinutes()>40){
            $("#errorAlert p").text(`입장 시간이 아닙니다`);
            Students.error();
            return true;
        }

        if(date.getMinutes()<this.hoursByGrade[Number(Students.student.grade)-1]){
            $("#errorAlert p").text(`${Students.student.grade}학년은 ${Number(this.hoursByGrade[Students.student.grade-1])}분부터 입장 가능합니다`);
            Students.error();
            return true;
        }

        return false;
    }
}